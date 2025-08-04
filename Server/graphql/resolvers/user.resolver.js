// Importing necessary modules
import User from "../../models/user.model.js"; // Importing the User model
import pubsub from "../pubsub.js";
import { ApolloError } from "apollo-server-errors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
// const authenticator = require("../../middleware/tokenAuthenticator");

// Resolver object for user-related operations
const userResolver = {
	Query: {
		// Resolver for a test query
		hello: async () => {
			console.log("hello world"); // Logging "hello world"
			return "hello world"; // Returning "hello world"
		},

		// Resolver to fetch all users
		getAllUsers: async (_, __, { user }) => {
			try {
				console.log("Token user info:", user);

				// Ensure user token exists (authentication)
				if (!user) {
					throw new Error("Unauthorized: No user token was found.");
				}

				// Check if user has permission to view all users
				// Using permissions.canViewAllUsers to allow granular control
				if (!user.permissions || !user.permissions.canViewAllUsers) {
					throw new Error("Unauthorized: You do not have permission to view all users.");
				}
				// Fetch all users from database
				const users = await User.find();

				console.log("Users fetched by caller:", users);
				return users;
			} catch (error) {
				console.error("Error fetching all users:", error);
				throw error;
			}
		},

		getOneUser: async (_, { id }, { user }) => {
			try {
				if (!user) {
					throw new Error("Unauthorized: No user token was found.");
				}
				console.dir(user);

				// Fetch the target user data
				const userToReturn = await User.findById(id);
				if (!userToReturn) {
					throw new Error("User not found.");
				}

				// Allow if requester has global permission to view all users
				if (user.permissions?.canViewAllUsers || (user.permissions?.canViewSelf && user.userId === userToReturn.id)) {
					return userToReturn;
				}

				// Otherwise, deny access
				throw new Error("Unauthorized: You do not have permission to view this user.");
			} catch (error) {
				console.error("Error fetching user by ID:", error);
				throw error;
			}
		},
	},

	Mutation: {
		// Resolver to create a new user
		registerUser: async (_, { registerInput: { name, email, password, confirmPassword, role = "user", job, permissions } }, { pubsub }) => {
			try {
				// Check if user already exists
				const oldUser = await User.findOne({ email });
				if (oldUser) {
					throw new ApolloError(`User with email: ${email} already exists`, "USER_ALREADY_EXIST");
				}

				// Validate role; if invalid, default to noRole
				const validRoles = ["headAdmin", "admin", "subAdmin", "user", "noRole"];
				if (!validRoles.includes(role)) {
					role = "noRole";
				}

				// Use permissions as passed, or empty object if none provided
				const finalPermissions = permissions || {};

				// Create new user with the provided permissions and job info
				const newUser = new User({
					name,
					email,
					password,
					confirmPassword,
					role,
					job,
					permissions: finalPermissions,
				});

				// Generate JWT token with role and permissions included
				const tokenPayload = {
					userId: newUser.id,
					email,
					role: newUser.role,
					permissions: newUser.permissions,
				};
				const token = jwt.sign(tokenPayload, process.env.Secret_Key);
				newUser.token = token;

				// Save user to the database
				const res = await newUser.save();
				// Publish to subscription
				await pubsub.publish("USER_ADDED", {
					onChange: {
						eventType: "created",
						Changes: res,
					},
				});
				return {
					id: res.id,
					...res._doc,
				};
			} catch (err) {
				console.error("Error registering a new user:", err);
				throw err;
			}
		},

		loginUser: async (_, { loginInput: { email, password } }) => {
			try {
				// Find the user by email
				const user = await User.findOne({ email });

				if (user && (await bcrypt.compare(password, user.password))) {
					// Build payload with permissions and role

					// Build payload with permissions and role Sign token
					const token = jwt.sign(
						{
							userId: user.id,
							email: user.email,
							role: user.role,
							permissions: user.permissions,
						},
						process.env.Secret_Key
					);

					// Attach token to user
					user.token = token;

					// Return full user object
					return {
						id: user.id,
						...user._doc,
					};
				} else {
					throw new ApolloError("Incorrect Email OR Password", "INCORRECT_EMAIL_PASSWORD");
				}
			} catch (err) {
				console.log("error logging in user", err);
				throw err;
			}
		},

		updateUserProfile: async (_, { id, updateUserProfile: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword } }, { user }) => {
			try {
				if (!user) {
					throw new Error("Unauthorized: No user context.");
				}

				//  Check permissions
				if (!user.permissions?.canEditSelf) {
					throw new Error("Unauthorized: You do not have permission to update your profile.");
				}

				const targetUser = await User.findById(id);
				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND");
				}

				const isSelf = user.userId === id;
				if (!isSelf) {
					throw new Error("Unauthorized: You can only update your own profile.");
				}

				// Email update logic
				if (newEmail) {
					const existingUser = await User.findOne({ email: newEmail });
					if (existingUser && existingUser.id !== id) {
						throw new ApolloError(`User with email: ${newEmail} already exists`, "USER_ALREADY_EXIST");
					}

					if (!previousEmail) {
						throw new ApolloError("Previous email is required to update email", "EMAIL_VALIDATION_ERROR");
					}

					if (targetUser.email !== previousEmail) {
						throw new ApolloError("Previous email does not match", "PREVIOUS_EMAIL_MISMATCH");
					}

					targetUser.email = newEmail;
				}

				// Password update logic
				if (newPassword) {
					if (!previousPassword) {
						throw new ApolloError("Previous password is required to update your password", "PASSWORD_VALIDATION_ERROR");
					}

					const passwordMatch = await bcrypt.compare(previousPassword, targetUser.password);
					if (!passwordMatch) {
						throw new ApolloError("Previous password does not match", "PREVIOUS_PASSWORD_MISMATCH");
					}

					if (newPassword !== confirmNewPassword) {
						throw new ApolloError("Password and confirm password don't match", "PASSWORD_VALIDATION_ERROR");
					}

					targetUser.password = newPassword;
					targetUser.confirmPassword = confirmNewPassword;
				}

				if (name) targetUser.name = name;

				// New token
				const newToken = jwt.sign(
					{
						userId: targetUser.id,
						email: targetUser.email,
						role: targetUser.role,
						permissions: targetUser.permissions,
					},
					process.env.Secret_Key
				);

				targetUser.token = newToken;

				await targetUser.save();

				return {
					id: targetUser.id,
					name: targetUser.name,
					email: targetUser.email,
					permissions: targetUser.permissions,
					role: targetUser.role,
					token: newToken,
				};
			} catch (error) {
				console.error("Error updating user profile:", error);
				throw error;
			}
		},

		adminChangeUserProfile: async (_, { id, updateUserProfile: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword, newRole, newPermissions } }, { user }) => {
			// todo you need correct the permission validations and test that the code works as intended
			try {
				if (!user) {
					throw new Error("Unauthorized: No user context.");
				}

				const requesterRole = user.role;
				const perms = user.permissions || {};
				const targetUser = await User.findById(id);
				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND");
				}

				const isSelf = user.userId === id;
				const targetRole = targetUser.role;

				// Define role hierarchy
				const roleRank = {
					headAdmin: 3,
					admin: 2,
					subAdmin: 1,
					user: 0,
					noRole: -1,
				};

				// Step 1: Confirm requester is allowed to perform updates
				const allowedRoles = ["headAdmin", "admin", "subAdmin"];
				if (!allowedRoles.includes(requesterRole)) {
					throw new Error("Unauthorized: Your role cannot update users.");
				}

				const hasAllRequiredPerms = perms.canEditUsers === true && perms.canViewUsers === true && perms.canViewAllUsers === true;

				if (!hasAllRequiredPerms) {
					throw new Error("Unauthorized: You lack required permissions to update users.");
				}

				// Step 2: Sub-admin cannot change roles unless they have canChangeRole
				if (requesterRole === "subAdmin" && newRole && perms.canChangeRole !== true) {
					throw new Error("Unauthorized: Sub-admins cannot change roles without permission.");
				}

				// Step 3: Prevent updating someone with equal or higher role (unless self or headAdmin)
				if (!isSelf && roleRank[requesterRole] <= roleRank[targetRole]) {
					throw new Error("Unauthorized: You cannot update users with equal or higher role.");
				}

				// Step 4: Admin limitations
				if (requesterRole === "admin" && newRole) {
					if (newRole === "headAdmin") {
						throw new Error("Unauthorized: Admins cannot promote users to head admin.");
					}
					if (targetRole === "admin" && newRole !== "admin") {
						throw new Error("Unauthorized: Admins cannot demote other admins.");
					}
				}

				// Step 5: Ensure canChangeRole permission if role update is requested
				if (newRole && perms.canChangeRole !== true && requesterRole !== "headAdmin") {
					throw new Error("Unauthorized: You do not have permission to change roles.");
				}

				// Step 6: Handle email change
				if (newEmail) {
					const existingUser = await User.findOne({ email: newEmail });
					if (existingUser && existingUser.id !== id) {
						throw new ApolloError(`Email already in use`, "USER_ALREADY_EXIST");
					}

					if (!previousEmail) {
						throw new ApolloError("Previous email is required.", "EMAIL_VALIDATION_ERROR");
					}

					if (targetUser.email !== previousEmail) {
						throw new ApolloError("Previous email does not match.", "PREVIOUS_EMAIL_MISMATCH");
					}

					targetUser.email = newEmail;
				}

				// Step 7: Handle password change
				if (newPassword) {
					if (requesterRole !== "headAdmin") {
						if (!previousPassword) {
							throw new ApolloError("Previous password is required.", "PASSWORD_REQUIRED");
						}

						const isMatch = await bcrypt.compare(previousPassword, targetUser.password);
						if (!isMatch) {
							throw new ApolloError("Previous password is incorrect.", "PASSWORD_INCORRECT");
						}
					}

					if (newPassword !== confirmNewPassword) {
						throw new ApolloError("Passwords do not match.", "PASSWORD_MISMATCH");
					}

					targetUser.password = newPassword;
					targetUser.confirmPassword = confirmNewPassword;
				}

				// Step 8: Apply updates
				if (name) targetUser.name = name;
				if (newRole) targetUser.role = newRole;
				if (newPermissions) targetUser.permissions = { ...targetUser.permissions, newPermissions };

				// Step 9: Regenerate token
				const newToken = jwt.sign(
					{
						userId: targetUser.id,
						email: targetUser.email,
						role: targetUser.role,
						permissions: targetUser.permissions,
					},
					process.env.Secret_Key
				);

				targetUser.token = newToken;
				await targetUser.save();

				return targetUser;
			} catch (error) {
				console.error("Error in adminChangeUserProfile:", error);
				throw error;
			}
		},

		deleteOneUser: async (_, { id }, { user }) => {
			console.log("this is the token", user);
			if (!user || user.role !== "admin") {
				throw new Error("Unauthorized: Admin access required.");
			}

			return await User.findByIdAndDelete(id);
		},
	},

	Subscription: {
		// Subscription resolver
		onChange: {
			// Subscribe to certain events
			subscribe: () => pubsub.asyncIterableIterator(["USER_ADDED", "USER_UPDATED", "USER_DELETED"]),
		},
	},

	// Resolver for custom fields
	User: {
		createdAt: (user) => user.createdAt.toISOString(), // Format createdAt field
		updatedAt: (user) => user.updatedAt.toISOString(), // Format updatedAt field
	},
};

export { userResolver }; // Export the resolver
