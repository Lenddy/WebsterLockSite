// Importing necessary modules
import User from "../../models/user.model.js"; // User model
import pubsub from "../pubsub.js"; // PubSub for subscriptions
import { ApolloError } from "apollo-server-errors"; // Apollo error handling
import jwt from "jsonwebtoken"; // JWT for token creation
import bcrypt from "bcrypt"; // Bcrypt for password hashing
import { can } from "../../isAdmin.js";
import { ROLE_PERMISSIONS } from "../../role.config.js";

// Resolver object for user-related operations
const userResolver = {
	Query: {
		// Test query resolver
		hello: async () => {
			console.log("hello world"); // Log test message
			return "hello world"; // Return test string
		},

		// Fetch all users
		getAllUsers: async (_, __, { user }) => {
			try {
				// console.log("Token user info:", user); // Log user info from token

				if (!user) {
					throw new ApolloError("Unauthorized: No user token was found."); // Check authentication
				}

				if (!can(user, "users:read:any")) {
					throw new ApolloError("Unauthorized: You do not have permission to view all users."); // Check permissions
				}

				const users = await User.find(); // Fetch all users from DB
				// console.log("Users fetched by caller:", users); // Log fetched users
				return users; // Return users
			} catch (error) {
				console.error("Error fetching all users:", error); // Log error
				throw error; // Rethrow error
			}
		},

		// Fetch one user by ID
		getOneUser: async (_, { id }, { user }) => {
			try {
				if (!user) {
					throw new ApolloError("Unauthorized: No user token was found."); // Check authentication
				}
				// console.dir(user); // Log user info

				if (can(user, "users:read:any") || can(user, "users:read:own", { ownerId: id })) {
					// return userToReturn; // Return user if allowed
					const userToReturn = await User.findById(id); // Find user by ID
					if (!userToReturn) {
						throw new ApolloError("User not found."); // Check if user exists
					}
					return userToReturn; // Return user if allowed
				}

				// Check permissions for viewing user
				// if (user.permissions?.canViewAllUsers || (user.permissions?.canViewSelf && user.userId === userToReturn.id)) {
				// 	return userToReturn; // Return user if allowed
				// }

				throw new ApolloError("Unauthorized: You do not have permission to view this user."); // Unauthorized
			} catch (error) {
				console.error("Error fetching user by ID:", error); // Log error
				throw error; // Rethrow error
			}
		},
	},

	Mutation: {
		// Register a new user
		registerUser: async (_, { input: { name, email, password, confirmPassword, role = "user", job, permissions = [], employeeNum, department } }, { user, pubsub }) => {
			try {
				/*
		|--------------------------------------------------------------------------
		| RBAC: Can create users?
		|--------------------------------------------------------------------------
		*/
				if (!can(user, "users:create:any")) {
					throw new ApolloError("Unauthorized: You do not have permission to create users.", "FORBIDDEN");
				}

				/*
		|--------------------------------------------------------------------------
		| Prevent duplicate emails
		|--------------------------------------------------------------------------
		*/
				const existingUser = await User.findOne({ email });
				if (existingUser) {
					throw new ApolloError(`User with email ${email} already exists.`, "USER_ALREADY_EXISTS");
				}

				/*
		|--------------------------------------------------------------------------
		| Validate role
		|--------------------------------------------------------------------------
		*/
				// const validRoles = Object.keys(ROLE_PERMISSIONS);
				let finalRole = Object.keys(ROLE_PERMISSIONS).includes(role) ? role : "noRole";

				/*
		|--------------------------------------------------------------------------
		| Normalize technician → user
		|--------------------------------------------------------------------------
		*/
				if (finalRole === "technician") {
					finalRole = "user";
				}

				/*
		|--------------------------------------------------------------------------
		| Resolve base permissions from role
		|--------------------------------------------------------------------------
		*/
				const rolePermissions = ROLE_PERMISSIONS[finalRole];
				if (!rolePermissions) {
					throw new ApolloError(`No permissions defined for role: ${finalRole}`, "ROLE_PERMISSION_MISSING");
				}

				/*
		|--------------------------------------------------------------------------
		| Extra permissions (optional, restricted)
		|--------------------------------------------------------------------------
		| Only admins / headAdmins can add permissions beyond role defaults
		|--------------------------------------------------------------------------
		*/
				let extraPermissions = [];

				if (permissions.length > 0) {
					if (!can(user, "role:change:any")) {
						throw new ApolloError("You are not allowed to assign custom permissions.", "FORBIDDEN");
					}

					// Safety filter: only allow known permission namespaces
					const allowedPrefixes = ["users:", "requests:", "items:", "role:"];
					extraPermissions = permissions.filter((perm) => allowedPrefixes.some((prefix) => perm.startsWith(prefix)));
				}

				/*
		|--------------------------------------------------------------------------
		| Final permissions = role defaults + optional extras
		|--------------------------------------------------------------------------
		*/
				const finalPermissions = Array.from(new Set([...rolePermissions, ...extraPermissions]));

				/*
		|--------------------------------------------------------------------------
		| Create user
		|--------------------------------------------------------------------------
		*/
				const newUser = new User({
					name,
					email,
					password,
					confirmPassword,
					role: finalRole,
					job,
					permissions: finalPermissions,
					employeeNum,
					department,
				});

				/*
		|--------------------------------------------------------------------------
		| Generate JWT
		|--------------------------------------------------------------------------
		*/
				const token = jwt.sign(
					{
						userId: newUser._id,
						name: newUser.name,
						email: newUser.email,
						role: newUser.role,
						permissions: newUser.permissions,
						employeeNum,
						department,
					},
					process.env.Secret_Key
				);

				newUser.token = token;

				/*
		|--------------------------------------------------------------------------
		| Persist user
		|--------------------------------------------------------------------------
		*/
				const savedUser = await newUser.save();

				/*
		|--------------------------------------------------------------------------
		| Publish event
		|--------------------------------------------------------------------------
		*/
				await pubsub.publish("USER_ADDED", {
					onUserChange: {
						eventType: "created",
						changeType: "single",
						change: {
							id: savedUser._id.toString(),
							name: savedUser.name,
							email: savedUser.email,
							role: savedUser.role,
							permissions: savedUser.permissions,
						},
					},
				});

				/*
		|--------------------------------------------------------------------------
		| Return payload
		|--------------------------------------------------------------------------
		*/
				return {
					id: savedUser._id.toString(),
					...savedUser._doc,
				};
			} catch (error) {
				console.error("Error registering user:", error);
				throw error;
			}
		},

		registerMultipleUsers: async (_, { inputs }, { user, pubsub }) => {
			//REVIEW - if  users are given the  the can change role , they would need to also have the user:read:any
			try {
				console.log("Raw inputs received:", JSON.stringify(inputs, null, 2));

				// Permission check
				if (user.role !== "headAdmin" && user.role !== "admin" && (user.role !== "subAdmin" || !user.permissions?.includes("users:create:any"))) {
					throw new ApolloError("Unauthorized: You lack required permissions to register users.", "USER_LACK_PERMISSION");
				}

				if (!Array.isArray(inputs) || inputs.length === 0) {
					throw new ApolloError("No users provided to register.");
				}

				const validRoles = ["headAdmin", "admin", "subAdmin", "user", "noRole", "technician"];

				//  Duplicate emails in input
				const emails = inputs.map((i) => i.email.toLowerCase());
				const duplicates = emails.filter((e, i) => emails.indexOf(e) !== i);
				if (duplicates.length > 0) {
					throw new ApolloError(`Duplicate emails found in input: ${[...new Set(duplicates)].join(", ")}`, "DUPLICATE_EMAILS_INPUT");
				}

				//  Existing users check
				const existingUsers = await User.find({ email: { $in: emails } });
				if (existingUsers.length > 0) {
					throw new ApolloError(`Users with these emails already exist: ${existingUsers.map((u) => u.email).join(", ")}`, "USER_ALREADY_EXIST");
				}

				// TODO - you might want to add permission here like you had on the prev version
				//  Prepare documents
				const userDocs = inputs.map((input) => {
					let { name, email, password, confirmPassword, role = "user", employeeNum, department, permissions = [] } = input;
					console.log("this are the permission", permissions);

					if (!validRoles.includes(role)) role = "noRole";

					//  Technician normalization
					if (role === "technician") {
						role = "user";
					}

					if (password !== confirmPassword) {
						throw new ApolloError(`Passwords do not match for ${email}`, "PASSWORD_MISMATCH");
					}

					/*--------------------------------------------------------------------------
		| Extra permissions (optional, restricted)
		|--------------------------------------------------------------------------
		| Only admins / headAdmins can add permissions beyond role defaults
		|--------------------------------------------------------------------------
		*/
					let extraPermissions = [];
					if (permissions?.length > 0) {
						if (!can(user, "role:change:any")) {
							throw new ApolloError("You are not allowed to assign custom permissions.", "FORBIDDEN");
						}

						// Safety filter: only allow known permission namespaces
						const allowedPrefixes = ["users:", "requests:", "items:", "role:"];
						extraPermissions = permissions.filter((perm) => allowedPrefixes.some((prefix) => perm.startsWith(prefix)));
					}

					/*|--------------------------------------------------------------------------
		| Final permissions = role defaults + optional extras
		|--------------------------------------------------------------------------
		*/
					const finalPermissions = Array.from(new Set([...ROLE_PERMISSIONS[role], ...extraPermissions]));

					const newUser = new User({
						name,
						email,
						password,
						confirmPassword,
						role,
						permissions: finalPermissions,
						employeeNum,
						department,
					});

					newUser.token = jwt.sign(
						{
							userId: newUser._id,
							name,
							email,
							role,
							permissions: finalPermissions,
							employeeNum,
							department,
						},
						process.env.Secret_Key
					);

					return newUser;
				});

				//  Bulk save
				const bulkSaveResult = await User.bulkSave(userDocs, { ordered: true });
				const savedUsersArray = Array.isArray(bulkSaveResult) ? bulkSaveResult : userDocs;

				//  Payload
				const payloadArray = savedUsersArray.map((u) => ({
					...u.toObject(),
					id: u._id.toString(),
				}));

				await pubsub.publish("USER_ADDED", {
					onUserChange: {
						eventType: "created",
						changeType: payloadArray.length > 1 ? "multiple" : "single",
						changes: payloadArray,
					},
				});

				return payloadArray;
			} catch (err) {
				console.error("Error registering multiple users:", err);
				throw err;
			}
		},

		// registerMultipleUsers: async (_, { inputs }, { user, pubsub }) => {
		// 	try {
		// 		console.log("Raw inputs received:", JSON.stringify(inputs, null, 2));

		// 		// Permission check
		// 		if (user.role !== "headAdmin" && user.role !== "admin" && (user.role !== "subAdmin" || !user.permissions.canRegisterUser)) {
		// 			throw new ApolloError("Unauthorized: You lack required permissions to register users.", "USER_LACK_PERMISSION");
		// 		}

		// 		if (!Array.isArray(inputs) || inputs.length === 0) {
		// 			throw new ApolloError("No users provided to register.");
		// 		}

		// 		const validRoles = ["headAdmin", "admin", "subAdmin", "user", "noRole", "technician"];

		// 		//  Check duplicate emails in input
		// 		const emails = inputs.map((i) => i.email.toLowerCase());
		// 		const duplicates = emails.filter((e, i) => emails.indexOf(e) !== i);
		// 		if (duplicates.length > 0) {
		// 			throw new ApolloError(`Duplicate emails found in input: ${[...new Set(duplicates)].join(", ")}`, "DUPLICATE_EMAILS_INPUT");
		// 		}

		// 		//  Check DB for existing users
		// 		const existingUsers = await User.find({ email: { $in: emails } });
		// 		if (existingUsers.length > 0) {
		// 			const existingEmails = existingUsers.map((u) => u.email);
		// 			throw new ApolloError(`Users with these emails already exist: ${existingEmails.join(", ")}`, "USER_ALREADY_EXIST");
		// 		}

		// 		//  Prepare Mongoose documents
		// 		const userDocs = inputs.map((input, idx) => {
		// 			let { name, email, password, confirmPassword, role = "user", permissions, employeeNum, department } = input;

		// 			if (!validRoles.includes(role)) {
		// 				role = "noRole";
		// 			}

		// 			if (password !== confirmPassword) {
		// 				throw new ApolloError(`Passwords do not match for ${email}`, "PASSWORD_MISMATCH");
		// 			}

		// 			const newUser = new User({
		// 				name,
		// 				email,
		// 				password, // raw password; pre-save hook will hash
		// 				confirmPassword, // for validation
		// 				role,
		// 				permissions: permissions || [],
		// 				employeeNum,
		// 				department,
		// 			});

		// 			// Temporary token (optional, will be overwritten if needed)
		// 			newUser.token = jwt.sign({ name, email, role, permissions: newUser.permissions }, process.env.Secret_Key);

		// 			return newUser;
		// 		});

		// 		console.log("Mongoose documents ready for bulkSave:", userDocs);

		// 		//  Bulk save all documents
		// 		// const bulkSaveResult = await User.bulkSave(userDocs, { ordered: true });
		// 		// console.log("bulkSave result:", bulkSaveResult);

		// 		// //  Convert result into an array of actual documents
		// 		// // Since bulkSave returns the docs themselves in Mongoose v7+, you can do:
		// 		// const savedUsersArray = Array.isArray(bulkSaveResult) ? bulkSaveResult : userDocs;

		// 		// //  Publish subscription events
		// 		// await Promise.all(
		// 		// 	savedUsersArray.map((savedUser) =>
		// 		// 		pubsub.publish("USER_ADDED", {
		// 		// 			onUserChange: { eventType: "created", Changes: savedUser },
		// 		// 		})
		// 		// 	)
		// 		// );
		// 		// Bulk save all documents
		// 		const bulkSaveResult = await User.bulkSave(userDocs, { ordered: true });

		// 		// Convert result into an array of actual documents
		// 		const savedUsersArray = Array.isArray(bulkSaveResult) ? bulkSaveResult : userDocs;

		// 		// Build payload array (serialize each user properly)
		// 		const payloadArray = savedUsersArray.map((user) => ({
		// 			...user.toObject(),
		// 			id: user._id.toString(),
		// 			// Optional: normalize nested arrays if user has any, e.g., roles
		// 			roles:
		// 				user.roles?.map((role) => ({
		// 					id: role._id?.toString() ?? role.id,
		// 					name: role.name,
		// 				})) ?? [],
		// 		}));

		// 		// Determine changeType
		// 		const changeType = payloadArray.length > 1 ? "multiple" : "single";

		// 		// Prepare changes
		// 		const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

		// 		// Publish a single event with all users
		// 		await pubsub.publish("USER_ADDED", {
		// 			onUserChange: {
		// 				eventType: "created",
		// 				changeType: changeType,
		// 				...(changeType === "multiple" ? { changes } : { change: changes }),
		// 			},
		// 		});

		// 		//  Prepare final response
		// 		const finalResult = savedUsersArray.map((u) => ({
		// 			id: u._id,
		// 			...u._doc,
		// 		}));

		// 		console.log("Final response to client:", finalResult);
		// 		return finalResult;
		// 	} catch (err) {
		// 		console.error("Error registering multiple users:", err);
		// 		throw err;
		// 	}
		// },

		loginUser: async (_, { input: { email, password } }) => {
			try {
				// console.log("credentials ", email, password); // Log credentials (not recommended in prod)
				const user = await User.findOne({ email }); // Find user by email

				if (user && (await bcrypt.compare(password, user.password))) {
					const token = jwt.sign(
						{
							userId: user.id, // User ID
							name: user.name, // User name
							email: user.email, // Email
							role: user.role, // Role
							permissions: user.permissions, // Permissions
							employeeNum: user.employeeNum,
							department: user.department,
						},
						process.env.Secret_Key // Secret key
					);

					user.token = token; // Attach token

					return {
						id: user.id, // User ID
						...user._doc, // User document
					};
				} else {
					throw new ApolloError("Incorrect Email OR Password", "INCORRECT_EMAIL_PASSWORD"); // Invalid credentials
				}
			} catch (err) {
				console.log("error logging in user", err); // Log error
				throw err; // Rethrow error
			}
		},

		// Update user profile (self)

		// TODO TEST THIS AGAIN DELETE THE 2 NEW USERS AND RE ADD THEM
		updateUserProfile: async (_, { id, input: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, employeeNum, department, job } }, { user, pubsub }) => {
			try {
				if (!user) {
					throw new ApolloError("Unauthorized: No user context.", "UNAUTHENTICATED");
				}

				const validRoles = ["headAdmin", "admin", "subAdmin"];
				// Self-update only
				const isSelf = user.userId === id;
				// || !user.role == "headAdmin"
				if (!isSelf) {
					throw new ApolloError("Unauthorized: You can only update your own profile.", "FORBIDDEN");
				}

				// Permission check
				if (!user.permissions?.includes("users:update:own")) {
					throw new ApolloError("Unauthorized: You do not have permission to update your profile.", "FORBIDDEN");
				}

				const targetUser = await User.findById(id);
				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND");
				}

				// --------------------
				// Email update
				// --------------------
				if (newEmail) {
					if (!previousEmail) {
						throw new ApolloError("Previous email is required to update email", "EMAIL_VALIDATION_ERROR");
					}

					if (targetUser.email !== previousEmail) {
						throw new ApolloError("Previous email does not match", "PREVIOUS_EMAIL_MISMATCH");
					}

					const existingUser = await User.findOne({ email: newEmail });
					if (existingUser && existingUser.id !== id) {
						throw new ApolloError(`User with email: ${newEmail} already exists`, "USER_ALREADY_EXIST");
					}

					targetUser.email = newEmail;
				}

				// --------------------
				// Password update
				// --------------------
				if (newPassword) {
					if (!previousPassword) {
						throw new ApolloError("Previous password is required to update your password", "PASSWORD_VALIDATION_ERROR");
					}

					const passwordMatch = await bcrypt.compare(previousPassword, targetUser.password);

					if (!passwordMatch) {
						throw new ApolloError("Previous password does not match", "PREVIOUS_PASSWORD_MISMATCH");
					}

					if (newPassword !== confirmNewPassword) {
						throw new ApolloError("Password and confirm password do not match", "PASSWORD_VALIDATION_ERROR");
					}

					targetUser.password = newPassword;
					targetUser.confirmPassword = confirmNewPassword;
				}

				// --------------------
				// Profile fields
				// --------------------

				if (name) targetUser.name = name;
				if (job) targetUser.job = job;

				// TODO - update  this part so that if theres is  a empNum or dep and their are not a admin and can update any to throw the error
				// if (validRoles.includes(user.role) && can(user, "users:update:any")) {
				if (employeeNum) targetUser.employeeNum = employeeNum;
				if (department) targetUser.department = department;
				// }
				// else throw new ApolloError("You are not allowed to update your Employ number or department");

				// --------------------
				// Token refresh
				// --------------------
				const newToken = jwt.sign(
					{
						userId: targetUser.id,
						name: targetUser.name,
						email: targetUser.email,
						role: targetUser.role,
						permissions: targetUser.permissions,
						employeeNum: targetUser.employeeNum,
						department: targetUser.department,
					},
					process.env.Secret_Key
				);

				targetUser.token = newToken;

				await targetUser.save();

				// --------------------
				// PubSub
				// --------------------
				const payload = {
					...targetUser.toObject(),
					id: targetUser._id.toString(),
				};

				await pubsub.publish("USER_UPDATED", {
					onUserChange: {
						eventType: "updated",
						changeType: "single",
						updateBy: user.userId,
						change: payload,
					},
				});

				return {
					id: targetUser.id,
					name: targetUser.name,
					email: targetUser.email,
					role: targetUser.role,
					permissions: targetUser.permissions,
					token: newToken,
					employeeNum: targetUser.employeeNum,
					department: targetUser.department,
				};
			} catch (error) {
				console.error("Error updating user profile:", error);
				throw error;
			}
		},

		// updateUserProfile: async (_, { id, input: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, employeeNum, department, role, job } }, { user, pubsub }) => {
		// 	console.log("updated data", name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, employeeNum, department, role, job);

		// 	try {
		// 		if (!user) {
		// 			throw new ApolloError("Unauthorized: No user context."); // Check authentication
		// 		}

		// 		if (!user.permissions?.canEditSelf) {
		// 			throw new ApolloError("Unauthorized: You do not have permission to update your profile."); // Check permission
		// 		}

		// 		const targetUser = await User.findById(id); // Find user by ID
		// 		console.log();

		// 		if (!targetUser) {
		// 			throw new ApolloError("User not found", "USER_NOT_FOUND"); // User not found
		// 		}

		// 		if (targetUser.permissions.canNotBeUpdated) {
		// 			throw new ApolloError("Unauthorized: user can not be updated"); // Cannot update
		// 		}

		// 		const isSelf = user.userId === id; // Check if updating self
		// 		if (!isSelf) {
		// 			throw new ApolloError("Unauthorized: You can only update your own profile."); // Only self-update allowed
		// 		}

		// 		if (newEmail) {
		// 			const existingUser = await User.findOne({ email: newEmail }); // Check if email exists
		// 			if (existingUser && existingUser.id !== id) {
		// 				throw new ApolloError(`User with email: ${newEmail} already exists`, "USER_ALREADY_EXIST"); // Email in use
		// 			}

		// 			if (!previousEmail) {
		// 				throw new ApolloError("Previous email is required to update email", "EMAIL_VALIDATION_ERROR"); // Need previous email
		// 			}

		// 			if (targetUser.email !== previousEmail) {
		// 				throw new ApolloError("Previous email does not match", "PREVIOUS_EMAIL_MISMATCH"); // Email mismatch
		// 			}

		// 			targetUser.email = newEmail; // Update email
		// 		}

		// 		if (newPassword) {
		// 			if (!previousPassword) {
		// 				throw new ApolloError("Previous password is required to update your password", "PASSWORD_VALIDATION_ERROR"); // Need previous password
		// 			}

		// 			const passwordMatch = await bcrypt.compare(previousPassword, targetUser.password); // Check password
		// 			if (!passwordMatch) {
		// 				throw new ApolloError("Previous password does not match", "PREVIOUS_PASSWORD_MISMATCH"); // Password mismatch
		// 			}

		// 			if (newPassword !== confirmNewPassword) {
		// 				throw new ApolloError("Password and confirm password don't match", "PASSWORD_VALIDATION_ERROR"); // Confirm mismatch
		// 			}

		// 			targetUser.password = newPassword; // Update password
		// 			targetUser.confirmPassword = confirmNewPassword; // Update confirm password
		// 		}

		// 		if (name) targetUser.name = name; // Update name

		// 		if (employeeNum) targetUser.employeeNum = employeeNum;
		// 		if (department) targetUser.department = department;
		// 		const validRoles = ["headAdmin", "admin", "subAdmin", "user", "noRole", "technician"]; // Valid roles
		// 		if (!validRoles.includes(role)) {
		// 			role = "noRole"; // Default role if invalid
		// 		}
		// 		// if (role) targetUser.role = role;
		// 		if (job) targetUser.job = job;

		// 		const newToken = jwt.sign(
		// 			{
		// 				userId: targetUser?.id, // User ID
		// 				name: targetUser?.name,
		// 				email: targetUser?.email, // Email
		// 				role: targetUser?.role, // Role
		// 				employeeNum: targetUser?.employeeNum,
		// 				department: targetUser?.department,
		// 				permissions: targetUser?.permissions, // Permissions
		// 			},
		// 			process.env.Secret_Key // Secret key
		// 		);

		// 		targetUser.token = newToken; // Update token

		// 		// await targetUser.save(); // Save changes

		// 		// await pubsub.publish("USER_UPDATED", {
		// 		// 	onUserChange: {
		// 		// 		eventType: "updated", // Event type
		// 		// 		Changes: targetUser, // User data
		// 		// 	},
		// 		// });

		// 		// Save changes
		// 		await targetUser.save();

		// 		// Build payload
		// 		const payload = {
		// 			...targetUser.toObject(),
		// 			id: targetUser._id.toString(),
		// 			// Optional: normalize nested arrays if needed
		// 			// roles:
		// 			// 	targetUser?.map((role) => ({
		// 			// 		id: role._id?.toString() ?? role.id,
		// 			// 		name: role.name,
		// 			// 		email: role?.email, // Email
		// 			// 		role: role?.role, // Role
		// 			// 		employeeNum: role?.employeeNum,
		// 			// 		permissions: role?.permissions, // Permissions
		// 			// 	})) ?? [],
		// 		};
		// 		console.log("this is the user", user);
		// 		// Publish subscription event
		// 		await pubsub.publish("USER_UPDATED", {
		// 			onUserChange: {
		// 				eventType: "updated",
		// 				changeType: "single",
		// 				updateBy: user.userId,
		// 				change: payload,
		// 			},
		// 		});

		// 		return {
		// 			id: targetUser.id, // User ID
		// 			name: targetUser.name, // Name
		// 			email: targetUser.email, // Email
		// 			permissions: targetUser.permissions, // Permissions
		// 			role: targetUser.role, // Role
		// 			token: newToken, // Token
		// 			employeeNum: targetUser.employeeNum,
		// 			department: targetUser.department,
		// 		};
		// 	} catch (error) {
		// 		console.error("Error updating user profile:", error); // Log error
		// 		throw error; // Rethrow error
		// 	}
		// },

		adminChangeMultipleUserProfiles: async (
			_,
			{ inputs }, // inputs: [{ id, name, previousEmail, newEmail, ... }]
			{ user, pubsub }
		) => {
			// REVIEW the ids should be change from _id to id

			try {
				if (!user) {
					throw new ApolloError("Unauthorized: No user context.");
				}

				/*
		|--------------------------------------------------------------------------
		| RBAC: Global entry check
		| User must be able to update at least:
		| - their own profile OR
		| - any user profile
		|--------------------------------------------------------------------------
		*/
				const canUpdateAnyUser = can(user, "users:update:any");
				const canUpdateOwnUser = can(user, "users:update:own");

				if (!canUpdateAnyUser && !canUpdateOwnUser) {
					throw new ApolloError("Unauthorized: You cannot update user profiles.");
				}

				/*
		|--------------------------------------------------------------------------
		| Role hierarchy (authority level, NOT permission)
		|--------------------------------------------------------------------------
		*/
				const roleRank = {
					headAdmin: 5,
					admin: 4,
					subAdmin: 3,
					user: 2,
					noRole: 1,
				};

				/*
		|--------------------------------------------------------------------------
		| Validate duplicate IDs in request
		|--------------------------------------------------------------------------
		*/
				const ids = inputs.map((i) => i.id);
				const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
				if (duplicateIds.length > 0) {
					throw new ApolloError(`Duplicate user IDs in request: ${[...new Set(duplicateIds)].join(", ")}`);
				}

				/*
		|--------------------------------------------------------------------------
		| Validate duplicate new emails in request
		|--------------------------------------------------------------------------
		*/
				const newEmails = inputs.map((i) => i.newEmail).filter(Boolean);
				const duplicateNewEmails = newEmails.filter((e, idx) => newEmails.indexOf(e) !== idx);

				if (duplicateNewEmails.length > 0) {
					throw new ApolloError(`Duplicate new emails in request: ${[...new Set(duplicateNewEmails)].join(", ")}`);
				}

				/*
		|--------------------------------------------------------------------------
		| Fetch all target users
		|--------------------------------------------------------------------------
		*/
				const usersToUpdate = await User.find({ _id: { $in: ids } });
				if (!usersToUpdate.length) {
					throw new ApolloError("No matching users found.");
				}

				/*
		|--------------------------------------------------------------------------
		| Ensure new emails are not already taken
		|--------------------------------------------------------------------------
		*/
				if (newEmails.length > 0) {
					const existing = await User.find({ email: { $in: newEmails } });
					if (existing.length > 0) {
						throw new ApolloError(`These new emails are already taken: ${existing.map((u) => u.email).join(", ")}`);
					}
				}

				const bulkOps = [];
				const updatedUsers = [];

				for (const input of inputs) {
					const { id, name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, newRole, newPermissions, employeeNum, department } = input;

					const targetUser = usersToUpdate.find((u) => String(u._id) === String(id));
					if (!targetUser) continue;

					const isSelf = String(user.userId) === String(id);

					/*
			|--------------------------------------------------------------------------
			| RBAC: Per-user authorization (self vs others)
			|--------------------------------------------------------------------------
			*/
					if (isSelf) {
						if (!can(user, "users:update:own", { ownerId: id })) {
							throw new ApolloError("Unauthorized: Cannot update your own profile.");
						}
					} else {
						if (!can(user, "users:update:any")) {
							throw new ApolloError("Unauthorized: Cannot update other users.");
						}
					}

					/*
			|--------------------------------------------------------------------------
			| Role hierarchy protection
			|--------------------------------------------------------------------------
			*/
					if (!isSelf && roleRank[user.role] <= roleRank[targetUser.role]) {
						throw new ApolloError("Unauthorized: Cannot update user with equal or higher role.");
					}

					/*
			|--------------------------------------------------------------------------
			| RBAC: Role change permission
			|--------------------------------------------------------------------------
			*/
					if (newRole) {
						if (!can(user, "role:change:any")) {
							throw new ApolloError("Unauthorized: You cannot change user roles.");
						}
					}

					/*
			|--------------------------------------------------------------------------
			| Restricted fields (only headAdmin)
			|--------------------------------------------------------------------------
			*/
					const restrictedFields = ["employeeNum", "department"];
					if (!isSelf && restrictedFields.some((f) => f in input) && user.role !== "headAdmin") {
						throw new ApolloError("Unauthorized: Restricted fields cannot be updated.");
					}

					/*
			|--------------------------------------------------------------------------
			| Email update validation
			|--------------------------------------------------------------------------
			*/
					if (newEmail) {
						if (!previousEmail || targetUser.email !== previousEmail) {
							throw new ApolloError("Previous email does not match.");
						}
						targetUser.email = newEmail;
					}

					/*
			|--------------------------------------------------------------------------
			| Password update validation
			|--------------------------------------------------------------------------
			*/
					if (newPassword) {
						if (!isSelf && user.role !== "headAdmin") {
							// throw new ApolloError("Unauthorized: Cannot change another user's password.");
							if (!previousPassword) {
								throw new ApolloError("Previous password required");
							}
							const isMatch = await bcrypt.compare(previousPassword, targetUser.password);
							if (!isMatch) throw new ApolloError("Previous password incorrect");
						}

						if (newPassword !== confirmNewPassword) {
							throw new ApolloError("Passwords do not match.");
						}

						targetUser.password = await bcrypt.hash(newPassword, 10);
					}

					/*
			|--------------------------------------------------------------------------
			| Assign basic field updates
			|--------------------------------------------------------------------------
			*/
					if (name) targetUser.name = name;
					if (newRole) targetUser.role = newRole;
					if (employeeNum) targetUser.employeeNum = employeeNum;
					if (department) targetUser.department = department;

					/*
			|--------------------------------------------------------------------------
			| RBAC: Assign scoped permissions (string-based)
			|--------------------------------------------------------------------------
			*/
					if (newPermissions && Array.isArray(newPermissions)) {
						if (!can(user, "users:update:any")) {
							throw new ApolloError("Unauthorized: Cannot assign permissions.");
						}

						const allowedPrefixes = ["users:", "requests:", "items:", "role:"];
						const filtered = newPermissions.filter((perm) => allowedPrefixes.some((prefix) => perm.startsWith(prefix)));

						targetUser.permissions = Array.from(new Set([...(targetUser.permissions || []), ...filtered]));
					}

					/*
			|--------------------------------------------------------------------------
			| Regenerate JWT
			|--------------------------------------------------------------------------
			*/
					const newToken = jwt.sign(
						{
							userId: targetUser._id,
							name: targetUser.name,
							email: targetUser.email,
							role: targetUser.role,
							permissions: targetUser.permissions,
						},
						process.env.Secret_Key
					);

					targetUser.token = newToken;

					bulkOps.push({
						updateOne: {
							filter: { _id: id },
							update: {
								$set: {
									name: targetUser.name,
									email: targetUser.email,
									password: targetUser.password,
									role: targetUser.role,
									permissions: targetUser.permissions,
									employeeNum: targetUser.employeeNum,
									department: targetUser.department,
									token: newToken,
								},
							},
						},
					});

					updatedUsers.push({
						id: targetUser._id,
						name: targetUser.name,
						email: targetUser.email,
						role: targetUser.role,
						permissions: targetUser.permissions,
						token: newToken,
					});
				}

				if (bulkOps.length > 0) {
					await User.bulkWrite(bulkOps);
				}

				await pubsub.publish("USER_UPDATED", {
					onUserChange: {
						eventType: "updated",
						changeType: updatedUsers.length > 1 ? "multiple" : "single",
						updateBy: user.userId,
						changes: updatedUsers,
					},
				});

				return updatedUsers;
			} catch (error) {
				console.error("Error in adminChangeMultipleUserProfiles:", error);
				throw error;
			}
		},

		// adminChangeMultipleUserProfiles: async (
		// 	_,
		// 	{ inputs }, // inputs: [{ id, name, previousEmail, newEmail, ... }]
		// 	{ user, pubsub }
		// ) => {
		// 	try {
		// 		// console.log("users", user);
		// 		console.log("New inputs", inputs);

		// 		if (!user) throw new ApolloError("Unauthorized: No user context.");

		// 		// throw new ApolloError("testing new admins");

		// 		const requesterRole = user.role;
		// 		const perms = user.permissions || {};

		// 		const allowedRoles = ["headAdmin", "admin", "subAdmin"];
		// 		if (!allowedRoles.includes(requesterRole)) {
		// 			throw new ApolloError("Unauthorized: Your role cannot update users.");
		// 		}

		// 		const hasAllRequiredPerms = perms.canEditUsers === true && perms.canViewAllUsers === true;
		// 		// && perms.canViewUsers === true
		// 		if (!hasAllRequiredPerms) {
		// 			throw new ApolloError("Unauthorized: You lack required permissions.");
		// 		}

		// 		// --- Role hierarchy ranking ---
		// 		const roleRank = {
		// 			headAdmin: 3,
		// 			admin: 2,
		// 			subAdmin: 1,
		// 			user: 0,
		// 			technician: -1,
		// 			noRole: -2,
		// 		};

		// 		// --- Validate for duplicate IDs in request ---
		// 		const ids = inputs.map((i) => i.id);
		// 		const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
		// 		if (duplicateIds.length > 0) {
		// 			throw new ApolloError(`Duplicate user IDs in request: ${[...new Set(duplicateIds)].join(", ")}`);
		// 		}

		// 		// --- Validate for duplicate newEmails in request ---
		// 		const newEmails = inputs.map((i) => i.newEmail).filter((email) => !!email); // only non-null
		// 		const duplicateNewEmails = newEmails.filter((e, idx) => newEmails.indexOf(e) !== idx);
		// 		if (duplicateNewEmails.length > 0) {
		// 			throw new ApolloError(`Duplicate new emails in request: ${[...new Set(duplicateNewEmails)].join(", ")}`);
		// 		}

		// 		// Fetch users by IDs
		// 		const usersToUpdate = await User.find({ _id: { $in: ids } });
		// 		if (usersToUpdate.length === 0) {
		// 			throw new ApolloError("No matching users found.");
		// 		}

		// 		// --- Check if any newEmail already exists in DB ---
		// 		if (newEmails.length > 0) {
		// 			const existing = await User.find({ email: { $in: newEmails } });
		// 			if (existing.length > 0) {
		// 				const conflicts = existing.map((u) => u.email);
		// 				throw new ApolloError(`These new emails are already taken: ${conflicts.join(", ")}`);
		// 			}
		// 		}

		// 		const bulkOps = [];
		// 		const updatedUsers = [];

		// 		for (const input of inputs) {
		// 			const { id, name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, newRole, newPermissions, job, employeeNum, department } = input;

		// 			const targetUser = usersToUpdate.find((u) => u.id.toString() === id);
		// 			if (!targetUser) continue;

		// 			if (targetUser.permissions.canNotBeUpdated) {
		// 				throw new ApolloError(`User ${targetUser.email} cannot be updated`);
		// 			}

		// 			const isSelf = user.userId === id;
		// 			const targetRole = targetUser.role;

		// 			// --- role hierarchy & restrictions ---
		// 			if (!isSelf && roleRank[requesterRole] <= roleRank[targetRole]) {
		// 				throw new ApolloError("Unauthorized: Cannot update equal/higher role user.");
		// 			}
		// 			if (requesterRole === "admin" && newRole) {
		// 				if (newRole === "headAdmin") {
		// 					throw new ApolloError("Admins cannot promote to headAdmin.");
		// 				}
		// 				if (targetRole === "admin" && newRole !== "admin") {
		// 					throw new ApolloError("Admins cannot demote other admins.");
		// 				}
		// 			}
		// 			if (newRole && perms.canChangeRole !== true && requesterRole !== "headAdmin") {
		// 				throw new ApolloError("Unauthorized: You do not have permission to change roles.");
		// 			}

		// 			// --- check new email ---
		// 			if (newEmail) {
		// 				if (!previousEmail) throw new ApolloError("Previous email required");
		// 				if (targetUser.email !== previousEmail) {
		// 					throw new ApolloError("Previous email does not match");
		// 				}
		// 				targetUser.email = newEmail;
		// 			}

		// 			// --- check new password ---
		// 			if (newPassword) {
		// 				if (requesterRole !== "headAdmin") {
		// 					if (!previousPassword) {
		// 						throw new ApolloError("Previous password required");
		// 					}
		// 					const isMatch = await bcrypt.compare(previousPassword, targetUser.password);
		// 					if (!isMatch) throw new ApolloError("Previous password incorrect");
		// 				}
		// 				if (newPassword !== confirmNewPassword) {
		// 					throw new ApolloError("Passwords do not match");
		// 				}

		// 				targetUser.password = await bcrypt.hash(newPassword, 10);
		// 				targetUser.confirmPassword = await bcrypt.hash(confirmNewPassword, 10);
		// 			}

		// 			// --- apply field updates ---
		// 			if (name) targetUser.name = name;
		// 			if (job) targetUser.job = job;
		// 			if (newRole) targetUser.role = newRole;
		// 			if (employeeNum) targetUser.employeeNum = employeeNum;
		// 			if (department) targetUser.department = department;

		// 			if (newPermissions) {
		// 				const allowedPermissionKeys = ["canEditUsers", "canDeleteUsers", "canChangeRole", "canViewUsers", "canViewAllUsers", "canEditSelf", "canViewSelf", "canDeleteSelf", "canNotBeUpdated", "canRegisterUser"];
		// 				const filtered = Object.keys(newPermissions)
		// 					.filter((key) => allowedPermissionKeys.includes(key))
		// 					.reduce((obj, key) => {
		// 						obj[key] = newPermissions[key];
		// 						return obj;
		// 					}, {});
		// 				targetUser.permissions = {
		// 					...targetUser.permissions,
		// 					...filtered,
		// 				};
		// 			}

		// 			// --- generate new token ---
		// 			const newToken = jwt.sign(
		// 				{
		// 					userId: targetUser?.id,
		// 					name: targetUser?.name,
		// 					email: targetUser?.email,
		// 					role: targetUser?.role,
		// 					employeeNum: targetUser?.employeeNum,
		// 					department: targetUser?.department,
		// 					permissions: targetUser.permissions,
		// 				},
		// 				process.env.Secret_Key
		// 			);
		// 			targetUser.token = newToken;

		// 			// Add bulk update
		// 			bulkOps.push({
		// 				updateOne: {
		// 					filter: { _id: id },
		// 					update: {
		// 						$set: {
		// 							name: targetUser.name,
		// 							email: targetUser.email,
		// 							password: targetUser.password,
		// 							confirmPassword: targetUser.confirmPassword,
		// 							role: targetUser.role,
		// 							job: targetUser.job,
		// 							permissions: targetUser.permissions,
		// 							employeeNum: targetUser.employeeNum,
		// 							department: targetUser.department,
		// 							token: newToken,
		// 						},
		// 					},
		// 				},
		// 			});

		// 			updatedUsers.push({
		// 				id: targetUser.id,
		// 				name: targetUser.name,
		// 				email: targetUser.email,
		// 				permissions: targetUser.permissions,
		// 				role: targetUser.role,
		// 				token: newToken,
		// 				job: targetUser.job,
		// 				employeeNum: targetUser.employeeNum,
		// 				department: targetUser.department,
		// 			});

		// 			// if (bulkOps.length > 0) {
		// 			// 	await User.bulkWrite(bulkOps);
		// 			// }

		// 			// // publish one by one
		// 			// for (const u of updatedUsers) {
		// 			// 	await pubsub.publish("USER_UPDATED", {
		// 			// 		onUserChange: {
		// 			// 			eventType: "updated",
		// 			// 			Changes: u,
		// 			// 		},
		// 			// 	});

		// 			// After performing your bulk updates
		// 			if (bulkOps.length > 0) {
		// 				await User.bulkWrite(bulkOps);
		// 			}

		// 			// Build payload array
		// 			const payloadArray = updatedUsers.map((user) => ({
		// 				...user,
		// 				id: user.id.toString(),
		// 				// Optional: normalize nested structures if any
		// 			}));

		// 			const changeType = payloadArray.length > 1 ? "multiple" : "single";
		// 			const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

		// 			// Publish a single event with all updated users
		// 			await pubsub.publish("USER_UPDATED", {
		// 				onUserChange: {
		// 					eventType: "updated",
		// 					changeType,
		// 					updateBy: user?.userId,
		// 					...(changeType === "multiple" ? { changes } : { change: changes }),
		// 				},
		// 			});
		// 		}

		// 		return updatedUsers;
		// 	} catch (error) {
		// 		console.error("Error in adminChangeMultipleUserProfiles:", error);
		// 		throw error;
		// 	}
		// },

		// Delete a user

		deleteOneUser: async (_, { id }, { user, pubsub }) => {
			console.log(" deleting user with id:", id);
			if (!user) throw new Error("Unauthorized: No context provided."); // Check authentication

			const isSelf = user.userId.toString() === id; // Check if deleting self

			if (isSelf) {
				if (user.permissions.canNotBeDeleted) throw new ApolloError("You cannot delete your own account."); // Cannot delete self
				if (!user.permissions.canDeleteSelf) throw new ApolloError("You lack permission to delete your account."); // Permission check
			} else {
				if (!user.permissions.canDeleteUsers) throw new ApolloError("You lack permission to delete other users."); // Permission check

				const targetUser = await User.findById(id); // Find target user
				if (!targetUser) throw new ApolloError("User not found."); // User not found
				if (targetUser.permissions?.canNotBeDeleted) throw new ApolloError("This user cannot be deleted."); // Cannot delete
			}

			// const deletedUser = await User.findByIdAndDelete(id); // Delete user

			// await pubsub.publish("USER_DELETED", {
			// 	onUserChange: { eventType: "deleted", Changes: deletedUser }, // Publish event
			// });

			const deletedUser = await User.findByIdAndDelete(id); // Delete user
			if (!deletedUser) throw new ApolloError("User not found");

			// Publish subscription event
			await pubsub.publish("USER_DELETED", {
				onUserChange: {
					eventType: "deleted",
					changeType: "single",
					change: {
						...deletedUser.toObject(),
						id: deletedUser._id.toString(), // normalize id
					},
				},
			});

			return deletedUser; // Return deleted user
		},

		// Delete multiple users
		deleteMultipleUsers: async (_, { ids }, { user, pubsub }) => {
			try {
				if (!user) throw new Error("Unauthorized: No context provided.");

				// If trying to delete self, enforce self-delete rules
				if (ids.includes(user.userId.toString())) {
					if (user.permissions.canNotBeDeleted) {
						throw new ApolloError("You cannot delete your own account.");
					}
					if (!user.permissions.canDeleteSelf) {
						throw new ApolloError("You lack permission to delete your own account.");
					}
				}

				// Check delete permissions for others
				if (!user.permissions.canDeleteUsers) {
					throw new ApolloError("You lack permission to delete other users.");
				}

				// Fetch all target users
				const targetUsers = await User.find({ _id: { $in: ids } });

				if (targetUsers.length === 0) {
					throw new ApolloError("No users found to delete.");
				}

				// Validate if any target cannot be deleted
				for (const targetUser of targetUsers) {
					if (targetUser.permissions?.canNotBeDeleted) {
						throw new ApolloError(`User ${targetUser.name || targetUser._id} cannot be deleted.`);
					}
				}

				// // Perform bulk delete
				// const bulkOps = ids.map((id) => ({
				// 	deleteOne: { filter: { _id: id } },
				// }));

				// await User.bulkWrite(bulkOps);

				// // Publish subscription events for each deleted user
				// for (const deletedUser of targetUsers) {
				// 	await pubsub.publish("USER_DELETED", {
				// 		onUserChange: { eventType: "deleted", Changes: deletedUser },
				// 	});
				// }

				// Perform bulk delete
				const bulkOps = ids.map((id) => ({
					deleteOne: { filter: { _id: id } },
				}));

				await User.bulkWrite(bulkOps);

				// Publish a single subscription event for all deleted users
				const payloadArray = targetUsers.map((user) => ({
					...user.toObject(),
					id: user._id.toString(), // normalize id
				}));

				await pubsub.publish("USER_DELETED", {
					onUserChange: {
						eventType: "deleted",
						changeType: payloadArray.length > 1 ? "multiple" : "single",
						...(payloadArray.length > 1 ? { changes: payloadArray } : { change: payloadArray[0] }),
					},
				});

				return targetUsers; // Return deleted users
			} catch (error) {
				console.error("error deleting users", error);
			}
		},

		adminSyncAllUserPermissionsByRole: async (_, __, { user, pubsub }) => {
			try {
				/*
		|--------------------------------------------------------------------------
		| Authentication
		|--------------------------------------------------------------------------
		*/
				if (!user) {
					throw new ApolloError("Unauthorized: No user context.");
				}

				/*
		|--------------------------------------------------------------------------
		| RBAC Authorization
		| This is a system-wide destructive operation
		|--------------------------------------------------------------------------
		*/
				if (!can(user, "users:update:any") || !can(user, "role:change:any")) {
					throw new ApolloError("Unauthorized: You cannot sync permissions by role.", "FORBIDDEN");
				}

				/*
		|--------------------------------------------------------------------------
		| Fetch all users
		|--------------------------------------------------------------------------
		*/
				const users = await User.find({});
				if (!users.length) {
					throw new ApolloError("No users found.");
				}

				const bulkOps = [];
				const updatedUsers = [];

				/*
		|--------------------------------------------------------------------------
		| Process each user
		|--------------------------------------------------------------------------
		*/
				for (const targetUser of users) {
					let resolvedRole = targetUser.role;

					/*
			|--------------------------------------------------------------------------
			| Technician normalization
			| - Convert technician -> user
			| - Use user permissions
			|--------------------------------------------------------------------------
			*/
					if (resolvedRole === "technician") {
						resolvedRole = "user";
						targetUser.role = "user";
					}

					/*
			|--------------------------------------------------------------------------
			| Resolve permissions from role
			|--------------------------------------------------------------------------
			*/
					const rolePermissions = ROLE_PERMISSIONS[resolvedRole];

					if (!rolePermissions) {
						throw new ApolloError(`No default permissions defined for role: ${resolvedRole}`, "ROLE_PERMISSION_MISSING");
					}

					/*
			|--------------------------------------------------------------------------
			| Overwrite permissions strictly from role
			|--------------------------------------------------------------------------
			*/
					targetUser.permissions = [...rolePermissions];

					/*
			|--------------------------------------------------------------------------
			| Regenerate JWT to reflect updated role/permissions
			|--------------------------------------------------------------------------
			*/
					const newToken = jwt.sign(
						{
							userId: targetUser._id,
							name: targetUser.name,
							email: targetUser.email,
							role: targetUser.role,
							permissions: targetUser.permissions,
						},
						process.env.Secret_Key
					);

					targetUser.token = newToken;

					/*
			|--------------------------------------------------------------------------
			| Prepare bulk update
			|--------------------------------------------------------------------------
			*/
					bulkOps.push({
						updateOne: {
							filter: { _id: targetUser._id },
							update: {
								$set: {
									role: targetUser.role,
									permissions: targetUser.permissions,
									token: newToken,
								},
							},
						},
					});

					/*
			|--------------------------------------------------------------------------
			| Collect return payload
			|--------------------------------------------------------------------------
			*/
					updatedUsers.push({
						id: targetUser._id.toString(),
						name: targetUser.name,
						email: targetUser.email,
						role: targetUser.role,
						permissions: targetUser.permissions,
						token: newToken,
					});
				}

				/*
		|--------------------------------------------------------------------------
		| Execute bulk update
		|--------------------------------------------------------------------------
		*/
				if (bulkOps.length > 0) {
					await User.bulkWrite(bulkOps);
				}

				/*
		|--------------------------------------------------------------------------
		| Publish event for subscribers
		|--------------------------------------------------------------------------
		*/
				await pubsub.publish("USER_UPDATED", {
					onUserChange: {
						eventType: "updated",
						changeType: "multiple",
						updateBy: user.userId,
						changes: updatedUsers,
					},
				});

				/*
		|--------------------------------------------------------------------------
		| Return updated users
		|--------------------------------------------------------------------------
		*/
				return updatedUsers;
			} catch (error) {
				console.error("Error syncing permissions by role:", error);
				throw error;
			}
		},
	},

	Subscription: {
		// Subscription resolver for user changes
		onUserChange: {
			// pubsub.asyncIterator
			// pubsub.asyncIterableIterator
			subscribe: () => pubsub.asyncIterableIterator(["USER_ADDED", "USER_UPDATED", "USER_DELETED"]), // Subscribe to events
		},
	},

	User: {
		createdAt: (user) => user.createdAt.toISOString(), // Format createdAt
		updatedAt: (user) => user.updatedAt.toISOString(), // Format updatedAt
	},
};

export { userResolver }; // Export resolver
