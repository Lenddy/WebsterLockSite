// Importing necessary modules
import User from "../../models/user.model.js"; // User model
import pubsub from "../pubsub.js"; // PubSub for subscriptions
import { ApolloError } from "apollo-server-errors"; // Apollo error handling
import jwt from "jsonwebtoken"; // JWT for token creation
import bcrypt from "bcrypt"; // Bcrypt for password hashing
import { can, mergePermissions } from "../../isAdmin.js";
import { ROLE_PERMISSIONS, roleRank } from "../../role.config.js";

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
				console.log("all the users", users);
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

					const allowedPrefixes = ["users:", "requests:", "items:", "role:"];
					const isAllowed = (p) => allowedPrefixes.some((pre) => p.startsWith(pre));

					extraPermissions = permissions.filter(isAllowed);
				}

				/*
				|--------------------------------------------------------------------------
				| Final permissions = role defaults + extras (extras override)
				|--------------------------------------------------------------------------
				*/
				// const permissionMap = Object.create(null);

				// // Load role defaults first
				// for (const perm of rolePermissions) {
				// 	const [resource, action] = perm.split(":", 2);
				// 	if (!resource || !action) continue;

				// 	permissionMap[`${resource}:${action}`] = perm;
				// }

				// // Extras override role defaults
				// for (const perm of extraPermissions) {
				// 	const [resource, action] = perm.split(":", 2);
				// 	if (!resource || !action) continue;

				// 	permissionMap[`${resource}:${action}`] = perm;
				// }

				// const finalPermissions = Object.values(permissionMap);

				const finalPermissions = mergePermissions(ROLE_PERMISSIONS[role], extraPermissions);

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
				// console.log("check 1");

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
					| Final permissions = role defaults + extras (extras override)
					|--------------------------------------------------------------------------*/
					// const permissionMap = Object.create(null);

					// // 1) Load role defaults first
					// for (const perm of ROLE_PERMISSIONS[role]) {
					// 	const [resource, action] = perm.split(":", 2);
					// 	if (!resource || !action) continue;

					// 	permissionMap[`${resource}:${action}`] = perm;
					// }

					// // 2) Extras override role defaults
					// for (const perm of extraPermissions) {
					// 	const [resource, action] = perm.split(":", 2);
					// 	if (!resource || !action) continue;

					// 	permissionMap[`${resource}:${action}`] = perm;
					// }

					// const finalPermissions = Object.values(permissionMap);

					const finalPermissions = mergePermissions(ROLE_PERMISSIONS[role], extraPermissions);

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
		updateUserProfile: async (_, { id, input: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, employeeNum, department, job } }, { user, pubsub }) => {
			try {
				if (!user) {
					throw new ApolloError("Unauthorized: No user context.", "UNAUTHENTICATED");
				}

				const validRoles = ["headAdmin", "admin", "subAdmin"];
				// Self-update only
				const isSelf = user.userId === id;

				console.log("first role check");
				if (!isSelf && !Object.keys(validRoles).includes(user.role) && !can(user, "users:update:any")) {
					throw new ApolloError("Unauthorized: You can only update your own profile.", "FORBIDDEN");
				}

				// // throw new ApolloError("test for the valid roles");
				// console.log("second role check");
				// // Permission check
				// if (!user.permissions?.includes("users:update:own") || !user.permissions?.includes("users:update:any")) {
				// 	throw new ApolloError("Unauthorized: You do not have permission to update this profile.", "FORBIDDEN");
				// }

				const targetUser = await User.findById(id);
				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND");
				}

				if (user.role === targetUser.role && !can(user, "peers:update:any", { targetRole: targetUser.role })) {
					throw new ApolloError("You cant update Users with the same role as you");
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
				if (isSelf || (validRoles.includes(user.role) && can(user, "users:update:any")) || can(user, "users:update:peer")) {
					if (employeeNum) targetUser.employeeNum = employeeNum;
					if (department) targetUser.department = department;
				} else throw new ApolloError("You are not allowed to update your Employ number or department");

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
				const canUpdatePeer = can(user, "peer:update:any");
				const canUpdateOwnUser = can(user, "users:update:own");

				if (!canUpdateAnyUser && !canUpdateOwnUser) {
					throw new ApolloError("Unauthorized: You cannot update user profiles.");
				}

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
					}

					/*
			|--------------------------------------------------------------------------
			| Role hierarchy protection
			|--------------------------------------------------------------------------
			*/

					// if (!isSelf && roleRank[user.role] <= roleRank[targetUser.role]) {
					// 	throw new ApolloError("Unauthorized: Cannot update user with equal or higher role.");
					// }

					if (!isSelf) {
						// Head admin always allowed
						if (user.role !== "headAdmin") {
							// Higher role → never allowed
							if (roleRank[user.role] < roleRank[targetUser.role]) {
								throw new ApolloError("Unauthorized: Cannot update higher role user.");
							}

							// Same role → requires peer permission
							if (roleRank[user.role] === roleRank[targetUser.role] && !can(user, "peers:update:any", { targetRole: targetUser.role })) {
								throw new ApolloError("Unauthorized: Cannot update user with the same role are you.");
							}

							if (roleRank[user.role] !== roleRank[targetUser.role] && !can(user, "users:update:any")) {
								throw new ApolloError("Unauthorized: Cannot update other users.");
							}
						}
					}

					/*
			|--------------------------------------------------------------------------
			| RBAC: Role change permission
			|--------------------------------------------------------------------------
			*/
					if (newRole) {
						if (!can(user, "role:change:any") && !can(user, "users:update:any")) {
							throw new ApolloError("Unauthorized: You cannot change user roles.");
						}
					}

					/*
			|--------------------------------------------------------------------------
			| Restricted fields (only headAdmin)
			|--------------------------------------------------------------------------
			*/

					// TODO ADD EH
					const restrictedFields = ["employeeNum", "department"];
					if ((!isSelf && restrictedFields.some((f) => f in input) && user.role !== "headAdmin") || user.role !== "admin") {
						throw new ApolloError("Unauthorized: Restricted fields cannot be updated. (EmployeeNum / Department)");
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
					// if (newPermissions && Array.isArray(newPermissions)) {
					// 	if (!can(user, "users:update:any")) {
					// 		throw new ApolloError("Unauthorized: Cannot assign permissions.");
					// 	}

					// 	const allowedPrefixes = ["users:", "requests:", "items:", "role:"];
					// 	const filtered = newPermissions.filter((perm) => allowedPrefixes.some((prefix) => perm.startsWith(prefix)));

					// 	targetUser.permissions = Array.from(new Set([...(targetUser.permissions || []), ...filtered]));
					// }

					// TODO -put the merge permission  functions  where is spoused to go

					if (Array.isArray(newPermissions)) {
						if (!can(user, "users:update:any")) {
							throw new ApolloError("Unauthorized: Cannot assign permissions.");
						}

						const allowedPrefixes = ["users:", "requests:", "items:", "role:"];
						const isAllowed = (p) => allowedPrefixes.some((pre) => p.startsWith(pre));

						const filteredNewPermissions = newPermissions.filter(isAllowed);

						targetUser.permissions = mergePermissions(targetUser.permissions || [], filteredNewPermissions);
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

		// deleteOneUser: async (_, { id }, { user, pubsub }) => {
		// 	try {
		// 		if (!user) {
		// 			throw new ApolloError("Unauthorized: No user context.", "UNAUTHENTICATED");
		// 		}

		// 		// const isSelf = String(user.userId) === String(id);

		// 		// -----------------------
		// 		// SELF DELETE
		// 		// -----------------------
		// 		// if (isSelf) {
		// 		// 	if (!can(user, "users:delete:own", { ownerId: id })) {
		// 		// 		throw new ApolloError(
		// 		// 			"Unauthorized: You do not have permission to delete your account.",
		// 		// 			"FORBIDDEN"
		// 		// 		);
		// 		// 	}
		// 		// }
		// 		// -----------------------
		// 		// DELETE OTHER USER
		// 		// -----------------------
		// 		// else {
		// 		if (!can(user, "users:delete:any")) {
		// 			throw new ApolloError("Unauthorized: You do not have permission to delete other users.", "FORBIDDEN");
		// 		}
		// 		// }

		// 		const deletedUser = await User.findByIdAndDelete(id);
		// 		if (!deletedUser) {
		// 			throw new ApolloError("User not found.", "USER_NOT_FOUND");
		// 		}

		// 		// -----------------------
		// 		// PubSub event
		// 		// -----------------------
		// 		await pubsub.publish("USER_DELETED", {
		// 			onUserChange: {
		// 				eventType: "deleted",
		// 				changeType: "single",
		// 				change: {
		// 					...deletedUser.toObject(),
		// 					id: deletedUser._id.toString(),
		// 				},
		// 			},
		// 		});

		// 		return deletedUser;
		// 	} catch (error) {
		// 		console.error("Error deleting user:", error);
		// 		throw error;
		// 	}
		// },

		deleteOneUser: async (_, { id }, { user, pubsub }) => {
			try {
				if (!user) {
					throw new ApolloError("Unauthorized: No user context.", "UNAUTHENTICATED");
				}

				if (!can(user, "users:delete:any")) {
					throw new ApolloError("Unauthorized: You do not have permission to delete users.", "FORBIDDEN");
				}

				const targetUser = await User.findById(id);
				if (!targetUser) {
					throw new ApolloError("User not found.", "USER_NOT_FOUND");
				}

				/*
		|------------------------------------------------------------------
		| Role hierarchy + peer permission check (headAdmin excluded)
		|------------------------------------------------------------------
		*/
				if (user.role !== "headAdmin") {
					// Higher role → never allowed
					if (roleRank[user.role] < roleRank[targetUser.role]) {
						throw new ApolloError("Unauthorized: Cannot delete a user with a higher role.", "FORBIDDEN");
					}

					// Same role → requires peer permission
					if (roleRank[user.role] === roleRank[targetUser.role] && !can(user, "users:delete:peer", { targetRole: targetUser.role })) {
						throw new ApolloError("Unauthorized: Cannot delete a peer user.", "FORBIDDEN");
					}
				}

				const deletedUser = await User.findByIdAndDelete(id);

				await pubsub.publish("USER_DELETED", {
					onUserChange: {
						eventType: "deleted",
						changeType: "single",
						change: {
							...deletedUser.toObject(),
							id: deletedUser._id.toString(),
						},
					},
				});

				return deletedUser;
			} catch (error) {
				console.error("Error deleting user:", error);
				throw error;
			}
		},

		// deleteMultipleUsers: async (_, { ids }, { user, pubsub }) => {
		// 	try {
		// 		if (!user) {
		// 			throw new ApolloError("Unauthorized: No user context.", "UNAUTHENTICATED");
		// 		}

		// 		if (!Array.isArray(ids) || ids.length === 0) {
		// 			throw new ApolloError("No user IDs provided.", "BAD_REQUEST");
		// 		}

		// 		const userIdStr = String(user.userId);
		// 		const includesSelf = ids.some((id) => String(id) === userIdStr);
		// 		const includesOthers = ids.some((id) => String(id) !== userIdStr);

		// 		// -----------------------
		// 		// RBAC checks
		// 		// -----------------------
		// 		if (includesSelf) {
		// 			if (!can(user, "users:delete:any", { ownerId: user.userId })) {
		// 				throw new ApolloError("Unauthorized: You cannot delete your own account.", "FORBIDDEN");
		// 			}
		// 		}

		// 		if (includesOthers) {
		// 			if (!can(user, "users:delete:any")) {
		// 				throw new ApolloError("Unauthorized: You cannot delete other users.", "FORBIDDEN");
		// 			}
		// 		}

		// 		// -----------------------
		// 		// Fetch target users
		// 		// -----------------------
		// 		const targetUsers = await User.find({ _id: { $in: ids } });

		// 		if (!targetUsers.length) {
		// 			throw new ApolloError("No users found to delete.", "USER_NOT_FOUND");
		// 		}

		// 		// -----------------------
		// 		// Bulk delete
		// 		// -----------------------
		// 		const bulkOps = ids.map((id) => ({
		// 			deleteOne: { filter: { _id: id } },
		// 		}));

		// 		await User.bulkWrite(bulkOps);

		// 		// -----------------------
		// 		// PubSub payload
		// 		// -----------------------
		// 		const payloadArray = targetUsers.map((u) => ({
		// 			...u.toObject(),
		// 			id: u._id.toString(),
		// 		}));

		// 		await pubsub.publish("USER_DELETED", {
		// 			onUserChange: {
		// 				eventType: "deleted",
		// 				changeType: payloadArray.length > 1 ? "multiple" : "single",
		// 				...(payloadArray.length > 1 ? { changes: payloadArray } : { change: payloadArray[0] }),
		// 			},
		// 		});

		// 		return targetUsers;
		// 	} catch (error) {
		// 		console.error("Error deleting multiple users:", error);
		// 		throw error;
		// 	}
		// },

		deleteMultipleUsers: async (_, { ids }, { user, pubsub }) => {
			try {
				if (!user) {
					throw new ApolloError("Unauthorized: No user context.", "UNAUTHENTICATED");
				}

				if (!Array.isArray(ids) || ids.length === 0) {
					throw new ApolloError("No user IDs provided.", "BAD_REQUEST");
				}

				if (!can(user, "users:delete:any")) {
					throw new ApolloError("Unauthorized: You do not have permission to delete users.", "FORBIDDEN");
				}

				const targetUsers = await User.find({ _id: { $in: ids } });
				if (!targetUsers.length) {
					throw new ApolloError("No users found to delete.", "USER_NOT_FOUND");
				}

				/*
		|------------------------------------------------------------------
		| Role hierarchy + peer permission checks (headAdmin excluded)
		|------------------------------------------------------------------
		*/
				if (user.role !== "headAdmin") {
					for (const targetUser of targetUsers) {
						// Higher role → never allowed
						if (roleRank[user.role] < roleRank[targetUser.role]) {
							throw new ApolloError(`Unauthorized: Cannot delete higher role user (${targetUser.email}).`, "FORBIDDEN");
						}

						// Same role → requires peer permission
						if (roleRank[user.role] === roleRank[targetUser.role] && !can(user, "users:delete:peer", { targetRole: targetUser.role })) {
							throw new ApolloError(`Unauthorized: Cannot delete peer user (${targetUser.email}).`, "FORBIDDEN");
						}
					}
				}

				const bulkOps = ids.map((id) => ({
					deleteOne: { filter: { _id: id } },
				}));

				await User.bulkWrite(bulkOps);

				const payloadArray = targetUsers.map((u) => ({
					...u.toObject(),
					id: u._id.toString(),
				}));

				await pubsub.publish("USER_DELETED", {
					onUserChange: {
						eventType: "deleted",
						changeType: payloadArray.length > 1 ? "multiple" : "single",
						...(payloadArray.length > 1 ? { changes: payloadArray } : { change: payloadArray[0] }),
					},
				});

				return targetUsers;
			} catch (error) {
				console.error("Error deleting multiple users:", error);
				throw error;
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
