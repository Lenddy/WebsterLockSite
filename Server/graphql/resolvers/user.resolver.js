// Importing necessary modules
import User from "../../models/user.model.js"; // User model
import pubsub from "../pubsub.js"; // PubSub for subscriptions
import { ApolloError } from "apollo-server-errors"; // Apollo error handling
import jwt from "jsonwebtoken"; // JWT for token creation
import bcrypt from "bcrypt"; // Bcrypt for password hashing

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

				if (!user.permissions.canViewAllUsers) {
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

				const userToReturn = await User.findById(id); // Find user by ID
				if (!userToReturn) {
					throw new ApolloError("User not found."); // Check if user exists
				}

				// Check permissions for viewing user
				if (user.permissions?.canViewAllUsers || (user.permissions?.canViewSelf && user.userId === userToReturn.id)) {
					return userToReturn; // Return user if allowed
				}

				throw new ApolloError("Unauthorized: You do not have permission to view this user."); // Unauthorized
			} catch (error) {
				console.error("Error fetching user by ID:", error); // Log error
				throw error; // Rethrow error
			}
		},
	},

	Mutation: {
		// Register a new user
		registerUser: async (_, { input: { name, email, password, confirmPassword, role = "user", job, permissions } }, { user, pubsub }) => {
			try {
				if (user.role !== "headAdmin" && user.role !== "admin" && (user.role !== "subAdmin" || !user.permissions.canRegisterUser)) {
					throw new ApolloError("Unauthorized: You lack required permissions to register users.", "USER_LACK_PERMISSION");
				}

				const oldUser = await User.findOne({ email }); // Check if user exists
				if (oldUser) {
					throw new ApolloError(`User with email: ${email} already exists`, "USER_ALREADY_EXIST"); // Duplicate email
				}

				const validRoles = ["headAdmin", "admin", "subAdmin", "user", "noRole", "technician"]; // Valid roles
				if (!validRoles.includes(role)) {
					role = "noRole"; // Default role if invalid
				}

				const finalPermissions = permissions || {}; // Use provided permissions or empty

				const newUser = new User({
					name, // User name
					email, // User email
					password, // User password
					confirmPassword, // Confirm password
					role, // User role
					job, // User job
					permissions: finalPermissions, // User permissions
				});

				const tokenPayload = {
					userId: newUser.id, // User ID
					name,
					email, // Email
					role: newUser.role, // Role
					permissions: newUser.permissions, // Permissions
				};
				const token = jwt.sign(tokenPayload, process.env.Secret_Key); // Create JWT token
				newUser.token = token; // Attach token to user

				const res = await newUser.save(); // Save user to DB

				await pubsub.publish("USER_ADDED", {
					onUserChange: {
						eventType: "created", // Event type
						Changes: res, // User data
					},
				});
				return {
					id: res.id, // User ID
					...res._doc, // User document
				};
			} catch (err) {
				console.error("Error registering a new user:", err); // Log error
				throw err; // Rethrow error
			}
		},

		// Register multiple users at once
		// registerMultipleUsers: async (_, { inputs }, { user, pubsub }) => {
		// 	try {
		// 		// 1️ Permission check
		// 		if (user.role !== "headAdmin" && user.role !== "admin" && (user.role !== "subAdmin" || !user.permissions.canRegisterUser)) {
		// 			throw new ApolloError("Unauthorized: You lack required permissions to register users.", "USER_LACK_PERMISSION");
		// 		}
		// 		console.log("provided inputs for the register many ");
		// 		console.dir(inputs, { depth: null });

		// 		// 2️ Input validation
		// 		if (!Array.isArray(inputs) || inputs.length === 0) {
		// 			throw new ApolloError("No users provided to register.");
		// 		}

		// 		const validRoles = ["headAdmin", "admin", "subAdmin", "user", "noRole", "technician"];
		// 		const createdUsers = [];

		// 		// 3️ Loop through each input
		// 		for (const input of inputs) {
		// 			let { name, email, password, confirmPassword, role = "user", job, permissions } = input;

		// 			//  Check if email already exists
		// 			const existingUser = await User.findOne({ email });
		// 			if (existingUser) {
		// 				throw new ApolloError(`User with email: ${email} already exists`, "USER_ALREADY_EXIST");
		// 			}

		// 			// 3b Validate role
		// 			if (!validRoles.includes(role)) {
		// 				role = "noRole";
		// 			}

		// 			// 3c️⃣ Prepare permissions
		// 			const finalPermissions = permissions || {};

		// 			// 3d️⃣ Create new user instance
		// 			const newUser = new User({
		// 				name,
		// 				email,
		// 				password,
		// 				confirmPassword,
		// 				role,
		// 				job,
		// 				permissions: finalPermissions,
		// 			});

		// 			// 3e️⃣ Generate JWT token
		// 			const tokenPayload = {
		// 				userId: newUser.id,
		// 				name,
		// 				email,
		// 				role: newUser.role,
		// 				permissions: newUser.permissions,
		// 			};
		// 			const token = jwt.sign(tokenPayload, process.env.Secret_Key);
		// 			newUser.token = token;

		// 			// 3 Save user to DB
		// 			const savedUser = await newUser.save();
		// 			createdUsers.push(savedUser);

		// 			//  Publish subscription event

		// 			await pubsub.publish("USER_ADDED", {
		// 				onUserChange: {
		// 					eventType: "created",
		// 					Changes: savedUser,
		// 				},
		// 			});
		// 		}

		// 		// for (const request of createdRequests) {
		// 		// 					await pubsub.publish("USER_ADDED", {
		// 		// 						onMaterialRequestChange: { eventType: "created", Changes: request },
		// 		// 					});
		// 		// 				}

		// 		// 4️ Return all created users
		// 		return createdUsers.map((u) => ({
		// 			id: u.id,
		// 			...u._doc,
		// 		}));
		// 	} catch (err) {
		// 		console.error("Error registering multiple users:", err);
		// 		throw err;
		// 	}
		// },

		registerMultipleUsers: async (_, { inputs }, { user, pubsub }) => {
			try {
				// 1️ Permission check
				if (user.role !== "headAdmin" && user.role !== "admin" && (user.role !== "subAdmin" || !user.permissions.canRegisterUser)) {
					throw new ApolloError("Unauthorized: You lack required permissions to register users.", "USER_LACK_PERMISSION");
				}

				// 2️ Input validation
				if (!Array.isArray(inputs) || inputs.length === 0) {
					throw new ApolloError("No users provided to register.");
				}

				const validRoles = ["headAdmin", "admin", "subAdmin", "user", "noRole", "technician"];

				// 3️ Check for duplicate emails in the incoming list
				const emails = inputs.map((i) => i.email.toLowerCase());
				const duplicates = emails.filter((e, i) => emails.indexOf(e) !== i);
				if (duplicates.length > 0) {
					throw new ApolloError(`Duplicate emails found in input: ${[...new Set(duplicates)].join(", ")}`, "DUPLICATE_EMAILS_INPUT");
				}

				// 4️ Check if any emails already exist in DB
				const existingUsers = await User.find({ email: { $in: emails } });
				if (existingUsers.length > 0) {
					const existingEmails = existingUsers.map((u) => u.email);
					throw new ApolloError(`Users with these emails already exist: ${existingEmails.join(", ")}`, "USER_ALREADY_EXIST");
				}

				// 5️ Prepare new users
				const newUsers = inputs.map((input) => {
					let { name, email, password, confirmPassword, role = "user", job, permissions } = input;

					if (!validRoles.includes(role)) {
						role = "noRole";
					}

					const finalPermissions = permissions || {};

					const newUser = new User({
						name,
						email,
						password,
						confirmPassword,
						role,
						job,
						permissions: finalPermissions,
					});

					// Generate JWT token
					const tokenPayload = {
						userId: newUser.id,
						name,
						email,
						role: newUser.role,
						permissions: newUser.permissions,
					};
					const token = jwt.sign(tokenPayload, process.env.Secret_Key);
					newUser.token = token;

					return newUser;
				});

				// 6️ Bulk insert
				const createdUsers = await User.insertMany(newUsers, { ordered: false });

				// 7️ Publish subscription events in parallel
				await Promise.all(
					createdUsers.map((savedUser) =>
						pubsub.publish("USER_ADDED", {
							onUserChange: { eventType: "created", Changes: savedUser },
						})
					)
				);

				// 8️ Return users
				return createdUsers.map((u) => ({
					id: u.id,
					...u._doc,
				}));
			} catch (err) {
				console.error("Error registering multiple users:", err);
				throw err;
			}
		},

		// Login user
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
		updateUserProfile: async (_, { id, input: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword } }, { user, pubsub }) => {
			try {
				if (!user) {
					throw new ApolloError("Unauthorized: No user context."); // Check authentication
				}

				if (!user.permissions?.canEditSelf) {
					throw new ApolloError("Unauthorized: You do not have permission to update your profile."); // Check permission
				}

				const targetUser = await User.findById(id); // Find user by ID
				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND"); // User not found
				}

				if (targetUser.permissions.canNotBeUpdated) {
					throw new ApolloError("Unauthorized: user can not be updated"); // Cannot update
				}

				const isSelf = user.userId === id; // Check if updating self
				if (!isSelf) {
					throw new ApolloError("Unauthorized: You can only update your own profile."); // Only self-update allowed
				}

				if (newEmail) {
					const existingUser = await User.findOne({ email: newEmail }); // Check if email exists
					if (existingUser && existingUser.id !== id) {
						throw new ApolloError(`User with email: ${newEmail} already exists`, "USER_ALREADY_EXIST"); // Email in use
					}

					if (!previousEmail) {
						throw new ApolloError("Previous email is required to update email", "EMAIL_VALIDATION_ERROR"); // Need previous email
					}

					if (targetUser.email !== previousEmail) {
						throw new ApolloError("Previous email does not match", "PREVIOUS_EMAIL_MISMATCH"); // Email mismatch
					}

					targetUser.email = newEmail; // Update email
				}

				if (newPassword) {
					if (!previousPassword) {
						throw new ApolloError("Previous password is required to update your password", "PASSWORD_VALIDATION_ERROR"); // Need previous password
					}

					const passwordMatch = await bcrypt.compare(previousPassword, targetUser.password); // Check password
					if (!passwordMatch) {
						throw new ApolloError("Previous password does not match", "PREVIOUS_PASSWORD_MISMATCH"); // Password mismatch
					}

					if (newPassword !== confirmNewPassword) {
						throw new ApolloError("Password and confirm password don't match", "PASSWORD_VALIDATION_ERROR"); // Confirm mismatch
					}

					targetUser.password = newPassword; // Update password
					targetUser.confirmPassword = confirmNewPassword; // Update confirm password
				}

				if (name) targetUser.name = name; // Update name

				const newToken = jwt.sign(
					{
						userId: targetUser.id, // User ID
						name: targetUser.name,
						email: targetUser.email, // Email
						role: targetUser.role, // Role
						permissions: targetUser.permissions, // Permissions
					},
					process.env.Secret_Key // Secret key
				);

				targetUser.token = newToken; // Update token

				await targetUser.save(); // Save changes

				await pubsub.publish("USER_UPDATED", {
					onUserChange: {
						eventType: "updated", // Event type
						Changes: targetUser, // User data
					},
				});

				return {
					id: targetUser.id, // User ID
					name: targetUser.name, // Name
					email: targetUser.email, // Email
					permissions: targetUser.permissions, // Permissions
					role: targetUser.role, // Role
					token: newToken, // Token
				};
			} catch (error) {
				console.error("Error updating user profile:", error); // Log error
				throw error; // Rethrow error
			}
		},

		adminChangeMultipleUserProfiles: async (
			_,
			{ inputs }, // inputs: [{ id, name, previousEmail, newEmail, ... }]
			{ user, pubsub }
		) => {
			try {
				if (!user) throw new ApolloError("Unauthorized: No user context.");

				const requesterRole = user.role;
				const perms = user.permissions || {};

				const allowedRoles = ["headAdmin", "admin", "subAdmin"];
				if (!allowedRoles.includes(requesterRole)) {
					throw new ApolloError("Unauthorized: Your role cannot update users.");
				}

				const hasAllRequiredPerms = perms.canEditUsers === true && perms.canViewUsers === true && perms.canViewAllUsers === true;

				if (!hasAllRequiredPerms) {
					throw new ApolloError("Unauthorized: You lack required permissions.");
				}

				// --- Role hierarchy ranking ---
				const roleRank = {
					headAdmin: 3,
					admin: 2,
					subAdmin: 1,
					user: 0,
					technician: -1,
					noRole: -2,
				};

				// --- Validate for duplicate IDs in request ---
				const ids = inputs.map((i) => i.id);
				const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
				if (duplicateIds.length > 0) {
					throw new ApolloError(`Duplicate user IDs in request: ${[...new Set(duplicateIds)].join(", ")}`);
				}

				// --- Validate for duplicate newEmails in request ---
				const newEmails = inputs.map((i) => i.newEmail).filter((email) => !!email); // only non-null
				const duplicateNewEmails = newEmails.filter((e, idx) => newEmails.indexOf(e) !== idx);
				if (duplicateNewEmails.length > 0) {
					throw new ApolloError(`Duplicate new emails in request: ${[...new Set(duplicateNewEmails)].join(", ")}`);
				}

				// Fetch users by IDs
				const usersToUpdate = await User.find({ _id: { $in: ids } });
				if (usersToUpdate.length === 0) {
					throw new ApolloError("No matching users found.");
				}

				// --- Check if any newEmail already exists in DB ---
				if (newEmails.length > 0) {
					const existing = await User.find({ email: { $in: newEmails } });
					if (existing.length > 0) {
						const conflicts = existing.map((u) => u.email);
						throw new ApolloError(`These new emails are already taken: ${conflicts.join(", ")}`);
					}
				}

				const bulkOps = [];
				const updatedUsers = [];

				for (const input of inputs) {
					const { id, name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, newRole, newPermissions, job } = input;

					const targetUser = usersToUpdate.find((u) => u.id.toString() === id);
					if (!targetUser) continue;

					if (targetUser.permissions.canNotBeUpdated) {
						throw new ApolloError(`User ${targetUser.email} cannot be updated`);
					}

					const isSelf = user.userId === id;
					const targetRole = targetUser.role;

					// --- role hierarchy & restrictions ---
					if (!isSelf && roleRank[requesterRole] <= roleRank[targetRole]) {
						throw new ApolloError("Unauthorized: Cannot update equal/higher role user.");
					}
					if (requesterRole === "admin" && newRole) {
						if (newRole === "headAdmin") {
							throw new ApolloError("Admins cannot promote to headAdmin.");
						}
						if (targetRole === "admin" && newRole !== "admin") {
							throw new ApolloError("Admins cannot demote other admins.");
						}
					}
					if (newRole && perms.canChangeRole !== true && requesterRole !== "headAdmin") {
						throw new ApolloError("Unauthorized: You do not have permission to change roles.");
					}

					// --- check new email ---
					if (newEmail) {
						if (!previousEmail) throw new ApolloError("Previous email required");
						if (targetUser.email !== previousEmail) {
							throw new ApolloError("Previous email does not match");
						}
						targetUser.email = newEmail;
					}

					// --- check new password ---
					if (newPassword) {
						if (requesterRole !== "headAdmin") {
							if (!previousPassword) {
								throw new ApolloError("Previous password required");
							}
							const isMatch = await bcrypt.compare(previousPassword, targetUser.password);
							if (!isMatch) throw new ApolloError("Previous password incorrect");
						}
						if (newPassword !== confirmNewPassword) {
							throw new ApolloError("Passwords do not match");
						}
						targetUser.password = newPassword;
						targetUser.confirmPassword = confirmNewPassword;
					}

					// --- apply field updates ---
					if (name) targetUser.name = name;
					if (job) targetUser.job = job;
					if (newRole) targetUser.role = newRole;

					if (newPermissions) {
						const allowedPermissionKeys = ["canEditUsers", "canDeleteUsers", "canChangeRole", "canViewUsers", "canViewAllUsers", "canEditSelf", "canViewSelf", "canDeleteSelf", "canNotBeUpdated", "canRegisterUser"];
						const filtered = Object.keys(newPermissions)
							.filter((key) => allowedPermissionKeys.includes(key))
							.reduce((obj, key) => {
								obj[key] = newPermissions[key];
								return obj;
							}, {});
						targetUser.permissions = {
							...targetUser.permissions,
							...filtered,
						};
					}

					// --- generate new token ---
					const newToken = jwt.sign(
						{
							userId: targetUser.id,
							name: targetUser.name,
							email: targetUser.email,
							role: targetUser.role,
							permissions: targetUser.permissions,
						},
						process.env.Secret_Key
					);
					targetUser.token = newToken;

					// Add bulk update
					bulkOps.push({
						updateOne: {
							filter: { _id: id },
							update: {
								$set: {
									name: targetUser.name,
									email: targetUser.email,
									password: targetUser.password,
									confirmPassword: targetUser.confirmPassword,
									role: targetUser.role,
									job: targetUser.job,
									permissions: targetUser.permissions,
									token: newToken,
								},
							},
						},
					});

					updatedUsers.push({
						id: targetUser.id,
						name: targetUser.name,
						email: targetUser.email,
						permissions: targetUser.permissions,
						role: targetUser.role,
						token: newToken,
						job: targetUser.job,
					});
				}

				if (bulkOps.length > 0) {
					await User.bulkWrite(bulkOps);
				}

				// publish one by one
				for (const u of updatedUsers) {
					await pubsub.publish("USER_UPDATED", {
						onUserChange: {
							eventType: "updated",
							Changes: u,
						},
					});
				}

				return updatedUsers;
			} catch (error) {
				console.error("Error in adminChangeMultipleUserProfiles:", error);
				throw error;
			}
		},

		// Delete a user
		deleteOneUser: async (_, { id }, { user, pubsub }) => {
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

			const deletedUser = await User.findByIdAndDelete(id); // Delete user

			await pubsub.publish("USER_DELETED", {
				onUserChange: { eventType: "deleted", Changes: deletedUser }, // Publish event
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

				// Perform bulk delete
				const bulkOps = ids.map((id) => ({
					deleteOne: { filter: { _id: id } },
				}));

				await User.bulkWrite(bulkOps);

				// Publish subscription events for each deleted user
				for (const deletedUser of targetUsers) {
					await pubsub.publish("USER_DELETED", {
						onUserChange: { eventType: "deleted", Changes: deletedUser },
					});
				}

				return targetUsers; // Return deleted users
			} catch (error) {
				console.error("error deleting users", error);
			}
		},
	},

	Subscription: {
		// Subscription resolver for user changes
		onUserChange: {
			subscribe: () => pubsub.asyncIterableIterator(["USER_ADDED", "USER_UPDATED", "USER_DELETED"]), // Subscribe to events
		},
	},

	User: {
		createdAt: (user) => user.createdAt.toISOString(), // Format createdAt
		updatedAt: (user) => user.updatedAt.toISOString(), // Format updatedAt
	},
};

export { userResolver }; // Export resolver
