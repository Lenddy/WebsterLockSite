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
					throw new ApolloError("Unauthorized: No user token was found."); // Check authentication
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
					throw new ApolloError("Unauthorized: No user token was found."); // Check authentication
				}
				// console.dir(user); // Log user info

				const itemGroup = await ItemGroup.findById(id); // Find itemGroup by ID
				if (!itemGroup) {
					throw new ApolloError("Item group not found."); // Check if user exists
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

		createOneItemGroup: async (_, { input: { brand, itemsList } }, { user }) => {
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

				let logPub = await pubsub.publish("ITEMGROUP_ADDED", {
					onItemGroupChange: {
						eventType: "created",
						Changes: res,
					},
				});
				console.log("subs");
				console.dir(logPub, { depth: null });

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
		createMultipleItemGroups: async (_, { input }, { user, pubsub }) => {
			try {
				//  Role check: only headAdmin allowed
				if (user.role !== "headAdmin" && user.role !== "Admin") {
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

				// //  Insert many at once
				// const createdItemGroups = await ItemGroup.insertMany(
				// 	input.map((ig) => ({
				// 		brand: ig.brand,
				// 		itemsList: ig.itemsList || [], //  allow no items
				// 	}))
				// );

				// const forSub = createdItemGroups;

				// forSub?.forEach((group) => {
				// 	pubsub.publish("ITEMGROUP_ADDED", {
				// 		onItemGroupChange: {
				// 			eventType: "created",
				// 			Changes: group,
				// 		},
				// 	});
				// });

				// Insert multiple ItemGroups at once
				const createdItemGroups = await ItemGroup.insertMany(
					input.map((ig) => ({
						brand: ig.brand,
						itemsList: ig.itemsList || [], // Allow empty items
					}))
				);

				// Normalize and serialize created groups
				const payloadArray = createdItemGroups.map((group) => ({
					...group.toObject(),
					id: group._id.toString(),
					itemsList:
						group.itemsList?.map((item) => ({
							...(item.toObject?.() ?? item),
							id: item._id?.toString() ?? item.id,
						})) ?? [],
				}));

				// Determine if this is single or multiple creation
				const changeType = payloadArray.length > 1 ? "multiple" : "single";

				// Select proper change payload
				const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

				// Publish a single unified event
				await pubsub.publish("ITEMGROUP_ADDED", {
					onItemGroupChange: {
						eventType: "created",
						changeType: changeType,
						...(changeType === "multiple"
							? { changes } // plural for arrays
							: { change: changes }), // singular for single insert
					},
				});

				// Return the created item groups to the mutation
				return createdItemGroups;
			} catch (err) {
				throw new ApolloError(err.message, err.code || "ITEMGROUP_CREATION_FAILED");
			}
		},

		updateMultipleItemGroups: async (_, { input }, { user, pubsub }) => {
			try {
				// console.log("this is the input ________________");
				// console.dir(input, { depth: null });
				if (!user) throw new ApolloError("no user token.");
				// Only headAdmin can perform bulk updates
				if (user.role !== "headAdmin" && user.role !== "Admin") {
					throw new ApolloError("Not authorized. you dont have permission to make this update.");
				}

				// Must provide input
				if (!Array.isArray(input) || input.length === 0) {
					throw new ApolloError("No input provided.");
				}

				const bulkOps = [];

				for (const group of input) {
					const { id, brand, itemsList, brandNameUpdate } = group;

					// Must have id
					if (!id) {
						throw new ApolloError("Brand _id is required. New brands cannot be created.");
					}

					let hasValidAction = false;

					// --- 1) Update Brand Name ---
					if (brandNameUpdate && brand) {
						console.log("brand update");
						bulkOps.push({
							updateOne: {
								filter: { _id: id },
								update: { $set: { brand } },
							},
						});
						hasValidAction = true;
					}

					// --- 2) Process Items Individually ---
					if (Array.isArray(itemsList) && itemsList.length > 0) {
						for (const item of itemsList) {
							const { action } = item;

							// --- Add Item ---
							if (action?.toBeAdded) {
								console.log("adding item", item.itemName);
								bulkOps.push({
									updateOne: {
										filter: { _id: id },
										update: { $push: { itemsList: { itemName: item.itemName } } },
									},
								});
								hasValidAction = true;
							}

							// --- Update Item ---
							if (action?.toBeUpdated) {
								if (!item.id) {
									throw new ApolloError("Item _id is required to update an item.");
								}
								console.log("updating item", item.id);
								bulkOps.push({
									updateOne: {
										filter: { _id: id, "itemsList._id": item.id },
										update: { $set: { "itemsList.$.itemName": item.itemName } },
									},
								});
								hasValidAction = true;
							}

							// --- Delete Item ---
							if (action?.toBeDeleted) {
								if (!item.id) {
									throw new ApolloError("Item _id is required to delete an item.");
								}
								console.log("deleting item", item.id);
								bulkOps.push({
									updateOne: {
										filter: { _id: id },
										update: { $pull: { itemsList: { _id: item.id } } },
									},
								});
								hasValidAction = true;
							}
						}
					}

					// If a group has no valid action
					if (!hasValidAction) {
						throw new ApolloError(`No valid updates provided for brand ${brand} with id ${id}.`);
					}
				}

				// // No operations
				// if (bulkOps.length === 0) {
				// 	throw new ApolloError("No updates happened this time.");
				// }

				// // Run bulk operations
				// const result = await ItemGroup.bulkWrite(bulkOps);

				// // Return updated groups
				// const updatedGroups = await ItemGroup.find({
				// 	_id: { $in: input.map((g) => g.id) },
				// });

				// const forSub = updatedGroups;

				// forSub.forEach((group) => {
				// 	pubsub.publish("ITEMGROUP_UPDATED", {
				// 		onItemGroupChange: {
				// 			eventType: "updated",
				// 			Changes: group,
				// 		},
				// 	});
				// });

				// return updatedGroups;

				// No operations check
				if (bulkOps.length === 0) {
					throw new ApolloError("No updates happened this time.");
				}

				//  Execute bulk update
				await ItemGroup.bulkWrite(bulkOps);

				//  Retrieve updated groups
				const updatedGroups = await ItemGroup.find({
					_id: { $in: input.map((g) => g.id) },
				});

				//  Normalize payload
				const payloadArray = updatedGroups.map((group) => ({
					...group.toObject(),
					id: group._id.toString(),
					itemsList:
						group.itemsList?.map((item) => ({
							...(item.toObject?.() ?? item),
							id: item._id?.toString() ?? item.id,
						})) ?? [],
				}));

				// Determine if single or multiple
				const changeType = payloadArray.length > 1 ? "multiple" : "single";

				//  Select proper payload format
				const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

				// Publish a single unified event
				await pubsub.publish("ITEMGROUP_UPDATED", {
					onItemGroupChange: {
						eventType: "updated",
						changeType: changeType,
						...(changeType === "multiple"
							? { changes } // multiple updated
							: { change: changes }), // single updated
					},
				});

				// Return the updated records
				return updatedGroups;
			} catch (err) {
				console.error("Error updating/deleting Item group(s):", err);
				throw err;
			}
		},

		// Delete multiple item groups
		deleteMultipleItemGroups: async (_, { ids }, { user, pubsub }) => {
			try {
				console.log("IDs to delete:", ids);

				// --- 1) Role check ---
				if (!user) throw new AuthenticationError("no user token provided.");

				if (user.role !== "headAdmin" && user.role !== "Admin") {
					throw new AuthenticationError("Not authorized. Only headAdmin can delete item groups.");
				}

				// --- 2) Input validation ---
				if (!Array.isArray(ids) || ids.length === 0) {
					throw new UserInputError("No IDs provided. At least one ID is required.");
				}

				// --- 3) Find the groups first (so we can send them in subscription)
				// const groupsToDelete = await ItemGroup.find({ _id: { $in: ids } });
				// const forSub = groupsToDelete;

				// // --- 4) Delete groups ---
				// const result = await ItemGroup.deleteMany({ _id: { $in: ids } });

				// // --- 5) Handle no matches ---
				// if (result.deletedCount === 0) {
				// 	throw new UserInputError("No matching ItemGroups found for deletion.");
				// }

				// // --- 6) Publish subscription events ---
				// forSub.forEach((group) => {
				// 	pubsub.publish("ITEMGROUP_DELETED", {
				// 		onItemGroupChange: {
				// 			eventType: "deleted",
				// 			Changes: group,
				// 		},
				// 	});
				// });

				// // --- 7) Return deleted IDs ---
				// return groupsToDelete;
				//  Delete groups
				const groupsToDelete = await ItemGroup.find({ _id: { $in: ids } });
				if (!groupsToDelete.length) {
					throw new UserInputError("No matching ItemGroups found for deletion.");
				}

				// Store normalized version for pubsub
				const payloadArray = groupsToDelete.map((group) => ({
					...group.toObject(),
					id: group._id.toString(),
					itemsList:
						group.itemsList?.map((item) => ({
							...(item.toObject?.() ?? item),
							id: item._id?.toString() ?? item.id,
						})) ?? [],
				}));

				// Actually delete them
				await ItemGroup.deleteMany({ _id: { $in: ids } });

				// Determine change type
				const changeType = payloadArray.length > 1 ? "multiple" : "single";

				// Select payload format
				const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

				// Publish one unified PubSub event
				await pubsub.publish("ITEMGROUP_DELETED", {
					onItemGroupChange: {
						eventType: "deleted",
						changeType: changeType,
						...(changeType === "multiple"
							? { changes } // multiple deletions
							: { change: changes }), // single deletion
					},
				});

				// Return deleted groups (or IDs)
				return groupsToDelete;
			} catch (err) {
				console.error("Error deleting ItemGroups:", err);
				throw err; // Apollo will format this
			}
		},
	},

	Subscription: {
		// Subscription resolver for user changes
		onItemGroupChange: {
			// pubsub.asyncIterator
			// pubsub.asyncIterableIterator
			subscribe: () => pubsub.asyncIterableIterator(["ITEMGROUP_ADDED", "ITEMGROUP_UPDATED", "ITEMGROUP_DELETED"]), // Subscribe to events
		},
	},

	// ItemGroup: {
	// 	createdAt: (itemGroup) => itemGroup.createdAt.toISOString(), // Format createdAt
	// 	updatedAt: (itemGroup) => itemGroup.updatedAt.toISOString(), // Format updatedAt
	// },
};

export { itemGroupResolver }; // Export resolver
