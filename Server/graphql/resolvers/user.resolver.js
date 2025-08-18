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
					throw new Error("Unauthorized: No user token was found."); // Check authentication
				}

				if (!user.permissions || !user.permissions.canViewAllUsers) {
					throw new Error("Unauthorized: You do not have permission to view all users."); // Check permissions
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
					throw new Error("Unauthorized: No user token was found."); // Check authentication
				}
				// console.dir(user); // Log user info

				const userToReturn = await User.findById(id); // Find user by ID
				if (!userToReturn) {
					throw new Error("User not found."); // Check if user exists
				}

				// Check permissions for viewing user
				if (user.permissions?.canViewAllUsers || (user.permissions?.canViewSelf && user.userId === userToReturn.id)) {
					return userToReturn; // Return user if allowed
				}

				throw new Error("Unauthorized: You do not have permission to view this user."); // Unauthorized
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
				if (user.role !== "headAdmin" || user.role !== "admin" || (user.role !== "subAdmin" && !user.permissions.canRegisterUser)) {
					throw new ApolloError("Unauthorized: You lack required permissions to register users.", "USER_ALREADY_EXIST");
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
					onChange: {
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

		// Login user
		loginUser: async (_, { input: { email, password } }) => {
			try {
				console.log("credentials ", email, password); // Log credentials (not recommended in prod)
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
					throw new Error("Unauthorized: No user context."); // Check authentication
				}

				if (!user.permissions?.canEditSelf) {
					throw new Error("Unauthorized: You do not have permission to update your profile."); // Check permission
				}

				const targetUser = await User.findById(id); // Find user by ID
				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND"); // User not found
				}

				if (targetUser.permissions.canNotBeUpdated) {
					throw new ApolloError("Unauthorized: user cant not be updated"); // Cannot update
				}

				const isSelf = user.userId === id; // Check if updating self
				if (!isSelf) {
					throw new Error("Unauthorized: You can only update your own profile."); // Only self-update allowed
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
					onChange: {
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

		// Admin change user profile
		adminChangeUserProfile: async (_, { id, input: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, newRole, newPermissions, job } }, { user, pubsub }) => {
			try {
				if (!user) {
					throw new Error("Unauthorized: No user context."); // Check authentication
				}

				// console.log("this are the new permissions", newPermissions);
				const requesterRole = user.role; // Requester's role
				const perms = user.permissions || {}; // Requester's permissions
				const targetUser = await User.findById(id); // Find target user

				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND"); // User not found
				}

				if (targetUser.permissions.canNotBeUpdated) {
					throw new ApolloError("Unauthorized: user cant not be updated"); // Cannot update
				}

				const isSelf = user.userId === id; // Check if updating self
				const targetRole = targetUser.role; // Target user's role

				const roleRank = {
					headAdmin: 3, // Highest
					admin: 2,
					subAdmin: 1,
					user: 0,
					technician: -1,
					noRole: -2,
				};

				const allowedRoles = ["headAdmin", "admin", "subAdmin"]; // Roles allowed to update
				if (!allowedRoles.includes(requesterRole)) {
					throw new Error("Unauthorized: Your role cannot update users."); // Role not allowed
				}

				const hasAllRequiredPerms = perms.canEditUsers === true && perms.canViewUsers === true && perms.canViewAllUsers === true; // Check required permissions

				if (!hasAllRequiredPerms) {
					throw new Error("Unauthorized: You lack required permissions to update users."); // Missing permissions
				}

				if (requesterRole === "subAdmin" && newRole && perms.canChangeRole !== true) {
					throw new Error("Unauthorized: Sub-admins cannot change roles without permission."); // Sub-admin restriction
				}

				if (!isSelf && roleRank[requesterRole] <= roleRank[targetRole]) {
					throw new Error("Unauthorized: You cannot update users with equal or higher role."); // Role hierarchy check
				}

				if (requesterRole === "admin" && newRole) {
					if (newRole === "headAdmin") {
						throw new Error("Unauthorized: Admins cannot promote users to head admin."); // Admin restriction
					}
					if (targetRole === "admin" && newRole !== "admin") {
						throw new Error("Unauthorized: Admins cannot demote other admins."); // Admin restriction
					}
				}

				if (newRole && perms.canChangeRole !== true && requesterRole !== "headAdmin") {
					throw new Error("Unauthorized: You do not have permission to change roles."); // Permission check
				}

				if (newEmail) {
					const existingUser = await User.findOne({ email: newEmail }); // Check if email exists
					if (existingUser && existingUser.id !== id) {
						throw new ApolloError(`Email already in use`, "USER_ALREADY_EXIST"); // Email in use
					}

					if (!previousEmail) {
						throw new ApolloError("Previous email is required.", "EMAIL_VALIDATION_ERROR"); // Need previous email
					}

					if (targetUser.email !== previousEmail) {
						throw new ApolloError("Previous email does not match.", "PREVIOUS_EMAIL_MISMATCH"); // Email mismatch
					}

					targetUser.email = newEmail; // Update email
				}

				if (newPassword) {
					if (requesterRole !== "headAdmin") {
						if (!previousPassword) {
							throw new ApolloError("Previous password is required.", "PASSWORD_REQUIRED"); // Need previous password
						}

						const isMatch = await bcrypt.compare(previousPassword, targetUser.password); // Check password
						if (!isMatch) {
							throw new ApolloError("Previous password is incorrect.", "PASSWORD_INCORRECT"); // Password mismatch
						}
					}

					if (newPassword !== confirmNewPassword) {
						throw new ApolloError("Passwords do not match.", "PASSWORD_MISMATCH"); // Confirm mismatch
					}

					targetUser.password = newPassword; // Update password
					targetUser.confirmPassword = confirmNewPassword; // Update confirm password
				}

				const allowedPermissionKeys = ["canEditUsers", "canDeleteUsers", "canChangeRole", "canViewUsers", "canViewAllUsers", "canEditSelf", "canViewSelf", "canDeleteSelf"]; // Allowed permission keys

				if (name) targetUser.name = name; // Update name
				if (job) targetUser.job = job; // Update job
				if (newRole) targetUser.role = newRole; // Update role
				if (newPermissions && Object.keys(newPermissions).some((key) => allowedPermissionKeys.includes(key))) {
					const filteredPermissions = Object.keys(newPermissions)
						.filter((key) => allowedPermissionKeys.includes(key))
						.reduce((obj, key) => {
							obj[key] = newPermissions[key];
							return obj;
						}, {});

					targetUser.permissions = {
						...targetUser.permissions,
						...filteredPermissions,
					};
				}

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
					onChange: {
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
					job: targetUser.job,
				};
			} catch (error) {
				console.error("Error in adminChangeUserProfile:", error); // Log error
				throw error; // Rethrow error
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
				onChange: { eventType: "deleted", Changes: deletedUser }, // Publish event
			});

			return deletedUser; // Return deleted user
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
