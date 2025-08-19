// Importing necessary modules
import ItemGroup from "../../models/itemGroup.model.js";
import pubsub from "../pubsub.js"; // PubSub for subscriptions
import { ApolloError } from "apollo-server-errors"; // Apollo error handling
import jwt from "jsonwebtoken"; // JWT for token creation
import bcrypt from "bcrypt"; // Bcrypt for password hashing

// Resolver object for user-related operations
const itemGroupResolver = {
	Query: {
		// Test query resolver
		hello3: async () => {
			console.log("hello world 3"); // Log test message
			return "hello world"; // Return test string
		},

		// Fetch all users
		getAllItemGroups: async (_, __, { user }) => {
			try {
				// console.log("Token user info:", user); // Log user info from token

				if (!user) {
					throw new Error("Unauthorized: No user token was found."); // Check authentication
				}

				// if (!user.permissions || !user.permissions.canViewAllUsers) {
				// 	throw new Error("Unauthorized: You do not have permission to view all users."); // Check permissions
				// }

				const itemGroup = await ItemGroup.find(); // Fetch all itemGroup from DB

				return itemGroup; // Return ItemGroup
			} catch (error) {
				console.error("Error fetching all users:", error); // Log error
				throw error; // Rethrow error
			}
		},

		// Fetch one ItemGroup by ID
		getOneItemGroup: async (_, { id }, { user }) => {
			try {
				if (!user) {
					throw new Error("Unauthorized: No user token was found."); // Check authentication
				}
				// console.dir(user); // Log user info

				const itemGroup = await ItemGroup.findById(id); // Find itemGroup by ID
				if (!userToReturn) {
					throw new Error("User not found."); // Check if user exists
				}

				// Check permissions for viewing user

				return itemGroup; // Return user if allowed
			} catch (error) {
				console.error("Error fetching user by ID:", error); // Log error
				throw error; // Rethrow error
			}
		},
	},

	Mutation: {
		// Register a new user
		createOneItemGroup: async (_, { input: { brand, itemList } }, { user, pubsub }) => {
			try {
				if (user.role !== "headAdmin" || user.role !== "admin" || (user.role !== "subAdmin" && !user.permissions.canEditUsers)) {
					throw new ApolloError("Unauthorized: You lack required permissions to add an item group.", "USER_LACK_PERMISSION");
				}

				const newItem = new ItemGroup({
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

		updateOneItemGroup: async (_, { input: { id, description, items, approvalStatus, comment } }, { user }) => {
			try {
				if (!user) throw new Error("Unauthorized: No user context.");
				if ((!user.permissions.canEditUsers && user.role === "user") || user.role === "noRole" || user.role === "technician") {
					throw new Error("Unauthorized: You lack permission.");
				}

				const target = await MaterialRequest.findById(id);
				if (!target) throw new ApolloError("Material request was not found");

				let shouldSave = false;

				if (description) {
					target.description = description;
					shouldSave = true;
				}

				if (approvalStatus?.isApproved === true) {
					target.approvalStatus.approvedBy.userId = user.userId;
					target.approvalStatus.approvedBy.name = user.name;
					target.approvalStatus.approvedBy.email = user.email;
					target.approvalStatus.approvedAt = Date.now();
					target.approvalStatus.isApproved = approvalStatus.isApproved;
				}

				// ensure reviewer is tracked or update their comment
				const existingReviewer = target.reviewers.find((r) => r.userId.toString() === user.userId.toString());

				// If reviewer is new
				if (!existingReviewer) {
					target.reviewers.push({
						userId: user.userId,
						email: user.email,
						name: user.name,
						role: user.role,
						permissions: { ...user.permissions },
						comment: comment ? comment : undefined,
						reviewedAt: new Date(), //  set when first added
					});
					shouldSave = true;
				} else {
					// If reviewer exists and updates comment
					if (comment) {
						existingReviewer.comment = comment;
						existingReviewer.reviewedAt = new Date(); //  update reviewedAt on comment
						shouldSave = true;
					}
				}

				// permissions check
				const isReviewer = target.reviewers.some((r) => r.userId.toString() === user.userId.toString());

				const isAdmin = user.permissions.canEditUsers || user.role === "headAdmin";
				if (!isReviewer && !isAdmin) {
					throw new ApolloError("Unauthorized: You lack permission to update this request.");
				}

				const bulkOps = [];

				if (Array.isArray(items)) {
					for (const item of items) {
						const { id: itemId, itemName, quantity, color, side, size, action } = item;

						if (action.toBeAdded === true) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $push: { items: { quantity, itemName, color, side, size } } },
								},
							});
						} else if (action.toBeUpdated && itemId) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id, "items._id": itemId },
									update: { $set: { "items.$.quantity": quantity, "items.$.itemName": itemName, "items.$.color": color, "items.$.side": side, "items.$.size": size } },
								},
							});
						} else if (action.toBeDeleted && itemId) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $pull: { items: { _id: itemId } } },
								},
							});
						}
					}
				}

				await Promise.all([shouldSave ? target.save() : null, bulkOps.length > 0 ? MaterialRequest.bulkWrite(bulkOps) : null]);

				const updatedTarget = await MaterialRequest.findById(id);

				await pubsub.publish("MATERIAL_REQUEST_UPDATED", {
					onMaterialRequestChange: { eventType: "updated", Changes: updatedTarget },
				});

				return updatedTarget;
			} catch (error) {
				console.error("Error updating material request:", error);
				throw error;
			}
		},

		// Delete a user
		deleteOneItemGroup: async (_, { id }, { user, pubsub }) => {
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
	},

	Subscription: {
		// Subscription resolver for user changes
		onItemGroupChange: {
			subscribe: () => pubsub.asyncIterableIterator(["USER_ADDED", "USER_UPDATED", "USER_DELETED"]), // Subscribe to events
		},
	},

	User: {
		createdAt: (user) => user.createdAt.toISOString(), // Format createdAt
		updatedAt: (user) => user.updatedAt.toISOString(), // Format updatedAt
	},
};

export { itemGroupResolver }; // Export resolver
