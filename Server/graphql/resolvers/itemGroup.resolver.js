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

				const itemGroup = await ItemGroup.find(); // Fetch all itemGroup from DB

				return itemGroup; // Return ItemGroup
			} catch (error) {
				console.error("Error fetching all Items groups:", error); // Log error
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
				if (!itemGroup) {
					throw new Error("Item group not found."); // Check if user exists
				}

				// Check permissions for viewing user

				return itemGroup; // Return user if allowed
			} catch (error) {
				console.error("Error fetching item group by ID:", error); // Log error
				throw error; // Rethrow error
			}
		},
	},

	Mutation: {
		// Creating a new item group

		createOneItemGroup: async (_, { input: { brand, itemsList } }, { user, pubsub }) => {
			try {
				// console.log("this is the user ", user);

				//  Fix permissions check
				if (user.role !== "headAdmin" && user.role !== "admin" && (user.role !== "subAdmin" || !user.permissions.canEditUsers)) {
					throw new ApolloError("Unauthorized: You lack required permissions to add an item group.", "USER_LACK_PERMISSION");
				}

				// console.log("brand name ", brand, "items names ", itemsList);

				// Normalize input items (if provided)
				const normalizedItems = itemsList?.map((item) => ({
					itemName: item?.itemName.trim(),
				}));

				//  Step 1: Check if group with same brand exists
				const existingGroup = await ItemGroup.findOne({ brand });

				if (existingGroup) {
					// Case 1: Only brand provided, no items
					if (!itemsList || itemsList.length === 0) {
						throw new ApolloError(`Item group with brand name"${brand}" already exists.`, "ITEMGROUP_EXISTS");
					}

					// Case 2: Brand exists + items sent → check duplicates
					const existingItemNames = existingGroup.itemsList.map((i) => i.itemName.toLowerCase());

					const newItems = normalizedItems.filter((i) => !existingItemNames.includes(i.itemName.toLowerCase()));

					if (newItems.length === 0) {
						throw new ApolloError(`All provided items already exist in brand "${brand}".`, "ITEMS_ALREADY_EXIST");
					}

					//  Add only the non-duplicates
					existingGroup.itemsList.push(...newItems);
					const updatedGroup = await existingGroup.save();

					// Publish event
					await pubsub.publish("ITEMGROUP_UPDATED", {
						onItemGroupChange: {
							eventType: "updated",
							Changes: updatedGroup,
						},
					});

					return {
						id: updatedGroup.id,
						...updatedGroup._doc,
					};
				}

				// Case 3: No group exists → create new one
				const newItemGroup = new ItemGroup({
					brand,
					itemsList: normalizedItems,
				});

				const res = await newItemGroup.save();

				await pubsub.publish("ITEMGROUP_ADDED", {
					onItemGroupChange: {
						eventType: "created",
						Changes: res,
					},
				});

				return {
					id: res.id,
					...res._doc,
				};
			} catch (err) {
				console.error("Error creating/updating an Item group:", err);
				throw err;
			}
		},

		// Create multiple ItemGroups in one mutation
		createMultipleItemGroups: async (_, { input }, { user }) => {
			try {
				//  Role check: only headAdmin allowed
				if (user.role !== "headAdmin") {
					throw new ApolloError("Unauthorized: Only headAdmin can create multiple item groups.", "USER_LACK_PERMISSION");
				}

				//  Validate input is an array
				if (!Array.isArray(input) || input.length === 0) {
					throw new ApolloError("Input must be a non-empty array of item groups.", "INVALID_INPUT");
				}

				//  Check for duplicates within request
				const brandsInRequest = input.map((ig) => ig.brand);
				const duplicates = brandsInRequest.filter((b, i) => brandsInRequest.indexOf(b) !== i);
				if (duplicates.length > 0) {
					throw new ApolloError(`Duplicate brands in request: ${duplicates.join(", ")}`, "DUPLICATE_INPUT");
				}

				//  Check if any already exist in DB
				const existing = await ItemGroup.find({
					brand: { $in: brandsInRequest },
				});

				if (existing.length > 0) {
					const existingBrands = existing.map((e) => e.brand);
					throw new ApolloError(`These brands already exist: ${existingBrands.join(", ")}`, "BRAND_ALREADY_EXISTS");
				}

				//  Insert many at once
				const createdItemGroups = await ItemGroup.insertMany(
					input.map((ig) => ({
						brand: ig.brand,
						itemsList: ig.itemsList || [], // 👈 allow no items
					}))
				);

				return createdItemGroups;
			} catch (err) {
				throw new ApolloError(err.message, err.code || "ITEMGROUP_CREATION_FAILED");
			}
		},

		// updateOneItemGroup: async (_, { input: { id, description, items, approvalStatus, comment } }, { user }) => {
		// 	try {
		// 		if (!user) throw new Error("Unauthorized: No user context.");
		// 		if ((!user.permissions.canEditUsers && user.role === "user") || user.role === "noRole" || user.role === "technician") {
		// 			throw new Error("Unauthorized: You lack permission.");
		// 		}

		// 		const target = await MaterialRequest.findById(id);
		// 		if (!target) throw new ApolloError("Material request was not found");

		// 		let shouldSave = false;

		// 		if (description) {
		// 			target.description = description;
		// 			shouldSave = true;
		// 		}

		// 		if (approvalStatus?.isApproved === true) {
		// 			target.approvalStatus.approvedBy.userId = user.userId;
		// 			target.approvalStatus.approvedBy.name = user.name;
		// 			target.approvalStatus.approvedBy.email = user.email;
		// 			target.approvalStatus.approvedAt = Date.now();
		// 			target.approvalStatus.isApproved = approvalStatus.isApproved;
		// 		}

		// 		// ensure reviewer is tracked or update their comment
		// 		const existingReviewer = target.reviewers.find((r) => r.userId.toString() === user.userId.toString());

		// 		// If reviewer is new
		// 		if (!existingReviewer) {
		// 			target.reviewers.push({
		// 				userId: user.userId,
		// 				email: user.email,
		// 				name: user.name,
		// 				role: user.role,
		// 				permissions: { ...user.permissions },
		// 				comment: comment ? comment : undefined,
		// 				reviewedAt: new Date(), //  set when first added
		// 			});
		// 			shouldSave = true;
		// 		} else {
		// 			// If reviewer exists and updates comment
		// 			if (comment) {
		// 				existingReviewer.comment = comment;
		// 				existingReviewer.reviewedAt = new Date(); //  update reviewedAt on comment
		// 				shouldSave = true;
		// 			}
		// 		}

		// 		// permissions check
		// 		const isReviewer = target.reviewers.some((r) => r.userId.toString() === user.userId.toString());

		// 		const isAdmin = user.permissions.canEditUsers || user.role === "headAdmin";
		// 		if (!isReviewer && !isAdmin) {
		// 			throw new ApolloError("Unauthorized: You lack permission to update this request.");
		// 		}

		// 		const bulkOps = [];

		// 		if (Array.isArray(items)) {
		// 			for (const item of items) {
		// 				const { id: itemId, itemName, quantity, color, side, size, action } = item;

		// 				if (action.toBeAdded === true) {
		// 					bulkOps.push({
		// 						updateOne: {
		// 							filter: { _id: id },
		// 							update: { $push: { items: { quantity, itemName, color, side, size } } },
		// 						},
		// 					});
		// 				} else if (action.toBeUpdated && itemId) {
		// 					bulkOps.push({
		// 						updateOne: {
		// 							filter: { _id: id, "items._id": itemId },
		// 							update: { $set: { "items.$.quantity": quantity, "items.$.itemName": itemName, "items.$.color": color, "items.$.side": side, "items.$.size": size } },
		// 						},
		// 					});
		// 				} else if (action.toBeDeleted && itemId) {
		// 					bulkOps.push({
		// 						updateOne: {
		// 							filter: { _id: id },
		// 							update: { $pull: { items: { _id: itemId } } },
		// 						},
		// 					});
		// 				}
		// 			}
		// 		}

		// 		await Promise.all([shouldSave ? target.save() : null, bulkOps.length > 0 ? MaterialRequest.bulkWrite(bulkOps) : null]);

		// 		const updatedTarget = await MaterialRequest.findById(id);

		// 		await pubsub.publish("MATERIAL_REQUEST_UPDATED", {
		// 			onMaterialRequestChange: { eventType: "updated", Changes: updatedTarget },
		// 		});

		// 		return updatedTarget;
		// 	} catch (error) {
		// 		console.error("Error updating material request:", error);
		// 		throw error;
		// 	}
		// },

		updateMultipleItemGroups: async (_, { input }, { user }) => {
			try {
				console.log("this is the input ________________");
				console.dir(input, { depth: null });
				//  Only headAdmin can perform bulk updates
				if (!user || user.role !== "headAdmin") {
					throw new Error("Not authorized. Only headAdmin can perform bulk updates.");
				}

				const bulkOps = [];

				for (const group of input) {
					const { id, brand, itemsList, brandNameUpdate } = group;

					//  New brands cannot be created, must have _id
					if (!id) {
						throw new Error("Brand _id is required. New brands cannot be created.");
					}

					// --- 1) Update Brand Name ---
					if (brandNameUpdate && brand) {
						bulkOps.push({
							updateOne: {
								filter: { _id: id },
								update: { $set: { brand } },
							},
						});
					}

					// --- 2) Add Items ---
					if (itemsList?.action?.itemToBeAdded && itemsList?.length > 0) {
						itemsList.forEach((item) => {
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $push: { itemsList: item } },
								},
							});
						});
					}

					// --- 3) Update Items ---
					if (itemsList?.action?.itemToBeUpdated && itemsList?.length > 0) {
						itemsList.forEach((item) => {
							if (!item._id) {
								throw new Error("Item _id is required to update an item.");
							}
							bulkOps.push({
								updateOne: {
									filter: { _id: id, "itemsList._id": item._id },
									update: { $set: { "itemsList.$.itemName": item.itemName } },
								},
							});
						});
					}

					// --- 4) Delete Items ---
					if (itemsList?.action?.itemToBeDeleted && itemsList?.length > 0) {
						const idsToDelete = itemsList.map((i) => i._id);
						bulkOps.push({
							updateOne: {
								filter: { _id: id },
								update: { $pull: { itemsList: { _id: { $in: idsToDelete } } } },
							},
						});
					}
				}

				//  No operations found
				if (bulkOps.length === 0) {
					return { success: false, message: "No valid operations found." };
				}

				//  Execute all DB changes in one go
				const result = await ItemGroup.bulkWrite(bulkOps);

				return {
					success: true,
					message: "Bulk update completed successfully",
					modifiedCount: result.modifiedCount,
					insertedCount: result.insertedCount,
					deletedCount: result.deletedCount,
				};
			} catch (err) {
				console.error("Error updating/deleting Item group(s):", err);
				throw err;
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
			subscribe: () => pubsub.asyncIterableIterator(["ITEMGROUP_ADDED", "ITEMGROUP_UPDATED", "ITEMGROUP_DELETED"]), // Subscribe to events
		},
	},

	User: {
		createdAt: (user) => user.createdAt.toISOString(), // Format createdAt
		updatedAt: (user) => user.updatedAt.toISOString(), // Format updatedAt
	},
};

export { itemGroupResolver }; // Export resolver
