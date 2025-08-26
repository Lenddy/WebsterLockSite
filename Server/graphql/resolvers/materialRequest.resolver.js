// Import necessary modules and models
import { ApolloError } from "apollo-server-errors"; // For GraphQL error handling
import MaterialRequest from "../../models/materialRequest.model.js"; // Mongoose model for MaterialRequest
import pubsub from "../pubsub.js"; // PubSub instance for subscriptions
import mongoose from "mongoose";

/**
 * GraphQL resolvers for MaterialRequest operations.
 *
 * Handles queries, mutations, and subscriptions related to material requests.
 *
 * @namespace materialRequestResolvers
 *
 * @property {Object} Query - Query resolvers for fetching material requests.
 * @property {Function} Query.hello2 - Test query, returns "hello world". // simple test endpoint
 * @property {Function} Query.getAllMaterialRequests - Fetches all material requests (admin only). // lists all requests
 * @property {Function} Query.getOneMaterialRequest - Fetches a single material request by ID (admin only). // gets one request by id
 *
 * @property {Object} Mutation - Mutation resolvers for creating, updating, and deleting material requests.
 * @property {Function} Mutation.createONeMaterialRequest - Creates a new material request. // adds a new request
 * @property {Function} Mutation.updateOneMaterialRequest - Updates an existing material request. // edits request, items, approval status
 * @property {Function} Mutation.deleteOneMaterialRequest - Deletes a material request (admin only). // removes request by id
 *
 * @property {Object} Subscription - Subscription resolvers for listening to material request changes.
 * @property {Object} Subscription.onMaterialRequestChange - Subscribes to material request add/update/delete events. // live updates for clients
 *
 * @property {Object} MaterialRequest - Field resolvers for MaterialRequest type.
 * @property {Function} MaterialRequest.createdAt - Formats createdAt as ISO string. // date formatting
 * @property {Function} MaterialRequest.updatedAt - Formats updatedAt as ISO string. // date formatting
 */
const materialRequestResolvers = {
	// Query resolvers
	Query: {
		// Simple test query
		hello2: async () => {
			console.log("it hit"); // Log when called
			return "hello world"; // Return test string
		},

		// Fetch all material requests (admin only)
		getAllMaterialRequests: async (_, __, { user }) => {
			try {
				if (!user) throw new Error("Unauthorized: No user token was found."); // Require authentication
				if (!user.permissions.canViewAllUsers) throw new ApolloError("Unauthorized: You do not have permission to view all Material Request."); // Require permission

				// Fetch all requests, populating requester and reviewer
				const materialRequest = await MaterialRequest.find();

				return materialRequest; // Return result
			} catch (error) {
				console.log("there was an error fetching all the Material Request", error); // Log error
				throw error; // Rethrow error
			}
		},

		// Fetch a single material request by ID (admin only)
		getOneMaterialRequest: async (_, { id }, { user }) => {
			try {
				if (!user) throw new ApolloError("Unauthorized: No user token was found."); // Require authentication
				if (!user.permissions.canViewAllUsers) throw new ApolloError("Unauthorized: You do not have permission to view Material Requests."); // Require permission

				// Find by ID and populate fields
				const materialRequest = await MaterialRequest.findById(id);

				return materialRequest; // Return result
			} catch (err) {
				console.log("there was an error fetching one Material request", err, "\n____________________"); // Log error
				throw err; // Rethrow error
			}
		},
	},

	// Mutation resolvers
	Mutation: {
		createOneMaterialRequest: async (_, { input: { description, items } }, { user }) => {
			// Check if user context is provided (authentication)
			if (!user) throw new ApolloError("Unauthorized: no user context given.");

			console.log("items", items);

			try {
				// Normalize items array: create new objects for each item with itemName and quantity
				const normalizedItems = items.map((item) => ({
					// _id: new mongoose.Types.ObjectId(), // Optionally generate a new ObjectId for each item
					itemName: item.itemName, // Set item name
					quantity: item.quantity, // Set item quantity

					itemDescription: item?.itemDescription ? item?.itemDescription : null,
					color: item?.color ? item?.color : null,
					side: item?.side ? item?.side : null,
					size: item?.size ? item?.size : null,
				}));
				// console.log("info being send from the front end", normalizedItems);

				// Create a snapshot of the requester (user info at time of request)
				const requester = {
					userId: user.userId, // User ID of requester
					email: user.email, // Email of requester
					name: user.name, // Name of requester
					role: user.role, // Role of requester
					permissions: { ...user.permissions }, // Permissions of requester (shallow copy)
				};

				// Create a new MaterialRequest document
				const newMaterialRequest = new MaterialRequest({
					requester, // Store frozen requester info
					reviewers: [], // Initialize reviewers array as empty
					description, // Set description from input
					items: normalizedItems, // Set normalized items array
					addedDate: new Date().toISOString(), // Set creation date as ISO string
				});

				// Save the new material request to the database
				await newMaterialRequest.save();

				// Publish a subscription event for material request creation
				await pubsub.publish("MATERIAL_REQUEST_ADDED", {
					onMaterialRequestChange: { eventType: "created", Changes: newMaterialRequest }, // Event payload
				});

				// Return the newly created material request
				return newMaterialRequest;
			} catch (err) {
				// Log any errors that occur during creation
				console.log("Error creating material request", err, "\n____________________");
				// Rethrow the error for GraphQL error handling
				throw err;
			}
		},

		// Update an existing material request
		// updateOneMaterialRequest: async (_, { input: { id, description, items, approvalStatus } }, { user }) => {
		// 	try {
		// 		if (!user) throw new Error("Unauthorized: No user context."); // Require authentication
		// 		if ((!user.permissions.canEditUsers && user.role === "user") || user.role === "noRole") throw new Error("Unauthorized: You lack permission."); // Require permission

		// 		const target = await MaterialRequest.findById(id); // Find request by ID
		// 		console.log("user", user); // Log user info
		// 		if (!target) throw new ApolloError("Material request was not found"); // Error if not found

		// 		let shouldSave = false; // Track if save is needed

		// 		// Update description if provided
		// 		if (description) {
		// 			target.description = description;
		// 			shouldSave = true;
		// 		}

		// 		// Update approval status if provided
		// 		if (approvalStatus) {
		// 			target.approvalStatus.reviewedAt = Date.now();
		// 			if (approvalStatus.approved === true) target.approvalStatus.approved = true;
		// 			if (approvalStatus.denied === true) target.approvalStatus.denied = true;
		// 			if (approvalStatus.comment) target.approvalStatus.comment = approvalStatus.comment;
		// 			shouldSave = true;
		// 		}

		// 		// Set reviewer if not already set
		// 		if (!target.reviewerId) {
		// 			target.reviewerId = user.userId;
		// 		}

		// 		// Only allow original reviewer or admin to update
		// 		if (target.reviewerId !== user.userId || user.role === "user" || user.role !== "noRole" || user.permissions.canEditUsers == false) {
		// 			throw new ApolloError("Unauthorized: You lack permission to change this Material request you have to be the original reviewer or an admin to be able to make changes.");
		// 		}

		// 		const bulkOps = []; // Array for bulk operations
		// 		const newAddition = []; // Track new items
		// 		const newUpdate = []; // Track updated items
		// 		const newDeletion = []; // Track deleted items

		// 		// Handle item changes if provided
		// 		if (Array.isArray(items)) {
		// 			for (const item of items) {
		// 				const { id: itemId, itemName, quantity, action } = item;

		// 				// Add new item
		// 				if (action.toBeAdded === true) {
		// 					newAddition.push(item);
		// 					bulkOps.push({
		// 						updateOne: {
		// 							filter: { _id: id },
		// 							update: { $push: { items: { itemName, quantity } } },
		// 						},
		// 					});
		// 				}
		// 				// Update existing item
		// 				else if (action.toBeUpdated && itemId) {
		// 					newUpdate.push(item);
		// 					bulkOps.push({
		// 						updateOne: {
		// 							filter: { _id: id, "items._id": itemId },
		// 							update: {
		// 								$set: {
		// 									"items.$.quantity": quantity,
		// 									"items.$.itemName": itemName,
		// 								},
		// 							},
		// 						},
		// 					});
		// 				}
		// 				// Delete item
		// 				else if (action.toBeDeleted && itemId) {
		// 					newDeletion.push(item);
		// 					bulkOps.push({
		// 						updateOne: {
		// 							filter: { _id: id },
		// 							update: { $pull: { items: { _id: itemId } } },
		// 						},
		// 					});
		// 				}
		// 			}
		// 		}

		// 		console.log("__________________________________________________________________________________________");

		// 		// Save main document and perform bulk item updates in parallel
		// 		await Promise.all([shouldSave ? target.save() : null, bulkOps.length > 0 ? MaterialRequest.bulkWrite(bulkOps) : null]);

		// 		// Fetch updated document with populated fields
		// 		const updatedTarget = await MaterialRequest.findById(id).populate([{ path: "requesterId" }, { path: "reviewerId" }]);

		// 		await pubsub.publish("MATERIAL_REQUEST_UPDATED", {
		// 			onChange: { eventType: "updated", Changes: updatedTarget }, // Publish event
		// 		});

		// 		return updatedTarget; // Return updated request
		// 	} catch (error) {
		// 		console.error("Error updating material request:", error); // Log error
		// 		throw error; // Rethrow error
		// 	}
		// },

		updateOneMaterialRequest: async (_, { input: { id, description, items, approvalStatus, comment } }, { user }) => {
			try {
				if (!user) throw new ApolloError("Unauthorized: No user context.");
				if ((!user.permissions.canEditUsers && user.role === "user") || user.role === "noRole" || user.role === "technician") {
					throw new ApolloError("Unauthorized: You lack permission.");
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

		updateOneMaterialRequestItemDescription: async (_, { input: { id, items } }, { user }) => {
			try {
				if (!user) throw new ApolloError("Unauthorized: No user context.");

				const target = await MaterialRequest.findById(id);
				if (!target) throw new ApolloError("Material request was not found");

				// console.log("the targe requester is ", target?.requester?.userId);
				// console.log("the targe requester is ", user.userId);
				// console.log("is the target id the same  ", !target?.requester?.userId.equals(user.userId));

				// showing false if the ids are the same  show true if they are not to trigger the error message
				if (!target?.requester?.userId.equals(user.userId) || !user.role == "headAdmin") throw new ApolloError("You can only update you own items descriptions");

				const bulkOps = [];

				if (Array.isArray(items)) {
					for (const item of items) {
						const { id: itemId, itemDescription } = item;
						console.log("info that is being send ", id, itemId, itemDescription);

						bulkOps.push({
							updateOne: {
								filter: { _id: id, "items._id": itemId },
								update: { $set: { "items.$.itemDescription": itemDescription } },
							},
						});
					}
				}

				if (bulkOps.length > 0) {
					MaterialRequest.bulkWrite(bulkOps);
				}

				const updatedTarget = await MaterialRequest.findById(id);

				await pubsub.publish("MATERIAL_REQUEST_UPDATED", {
					onMaterialRequestChange: { eventType: "updated", Changes: updatedTarget },
				});

				return updatedTarget;
			} catch (error) {
				console.error("Error updating material request item description:", error);
				throw error;
			}
		},

		// Delete a material request (admin only)
		deleteOneMaterialRequest: async (_, { id }, { user }) => {
			if (!user) throw new ApolloError("Unauthorized: No context provided."); // Require authentication
			if (!user.permissions.canDeleteUsers) throw new ApolloError("You lack permission to delete Material request."); // Require permission

			const deletedMaterialRequest = await MaterialRequest.findByIdAndDelete(id); // Delete by ID
			if (!deletedMaterialRequest) throw new ApolloError("Material Request not found"); // Error if not found

			// Publish deletion event for subscriptions
			await pubsub.publish("MATERIAL_REQUEST_DELETED", {
				onMaterialRequestChange: { eventType: "deleted", Changes: deletedMaterialRequest },
			});

			// MaterialRequest;
			return deletedMaterialRequest; // Return deleted request
		},
	},

	// Subscription resolvers
	Subscription: {
		// Listen for changes to material requests
		onMaterialRequestChange: {
			subscribe: () => pubsub.asyncIterableIterator(["MATERIAL_REQUEST_ADDED", "MATERIAL_REQUEST_UPDATED", "MATERIAL_REQUEST_DELETED"]),
		},
	},

	// Field resolvers for MaterialRequest type
	MaterialRequest: {
		// Format createdAt as ISO string
		createdAt: (materialRequest) => materialRequest.createdAt.toISOString(),
		// Format updatedAt as ISO string
		updatedAt: (materialRequest) => materialRequest.updatedAt.toISOString(),
	},
};

export { materialRequestResolvers };
