// Import necessary modules and models
import { ApolloError } from "apollo-server-errors"; // For GraphQL error handling
import MaterialRequest from "../../models/materialRequest.model.js"; // Mongoose model for MaterialRequest
import pubsub from "../pubsub.js"; // PubSub instance for subscriptions

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
				if (!user.permissions || !user.permissions.canViewAllUsers) throw new Error("Unauthorized: You do not have permission to view all Material Request."); // Require permission

				// Fetch all requests, populating requester and reviewer
				const materialRequest = await MaterialRequest.find().populate("requesterId").populate("reviewerId");

				return materialRequest; // Return result
			} catch (error) {
				console.log("there was an error fetching all the Material Request", error); // Log error
				throw error; // Rethrow error
			}
		},

		// Fetch a single material request by ID (admin only)
		getOneMaterialRequest: async (_, { id }, { user }) => {
			try {
				if (!user) throw new Error("Unauthorized: No user token was found."); // Require authentication
				if (!user.permissions || !user.permissions.canViewAllUsers) throw new Error("Unauthorized: You do not have permission to view Material Requests."); // Require permission

				// Find by ID and populate fields
				const materialRequest = await MaterialRequest.findById(id).populate("requesterId").populate("reviewerId");

				return materialRequest; // Return result
			} catch (err) {
				console.log("there was an error fetching one Material request", err, "\n____________________"); // Log error
				throw err; // Rethrow error
			}
		},
	},

	// Mutation resolvers
	Mutation: {
		// Create a new material request
		createONeMaterialRequest: async (_, { input: { description, comment, items } }, { user }) => {
			if (!user) throw new Error("Unauthorized: no user context given."); // Require authentication

			try {
				// Create new request document
				const newMaterialRequest = new MaterialRequest({
					requesterId: user.userId, // Set requester
					description, // Set description
					comment, // Set comment
					items, // Set items array
					addedDate: new Date().toISOString(), // Set creation date
				});

				await newMaterialRequest.save().populate([{ path: "requesterId" }, { path: "reviewerId" }]); // Save to DB // Populate requester and reviewer fields

				await newMaterialRequest.populate([{ path: "requesterId" }, { path: "reviewerId" }]);

				await pubsub.publish("MATERIAL_REQUEST_ADDED", {
					onChange: { eventType: "created", Changes: newMaterialRequest }, // Publish event
				});

				return newMaterialRequest; // Return created request
			} catch (err) {
				console.log("Error creating material request", err, "\n____________________"); // Log error
				throw err; // Rethrow error
			}
		},

		// Update an existing material request
		updateOneMaterialRequest: async (_, { input: { id, description, items, approvalStatus } }, { user }) => {
			try {
				if (!user) throw new Error("Unauthorized: No user context."); // Require authentication
				if ((!user.permissions.canEditUsers && user.role === "user") || user.role === "noRole") throw new Error("Unauthorized: You lack permission."); // Require permission

				const target = await MaterialRequest.findById(id); // Find request by ID
				console.log("user", user); // Log user info
				if (!target) throw new ApolloError("Material request was not found"); // Error if not found

				let shouldSave = false; // Track if save is needed

				// Update description if provided
				if (description) {
					target.description = description;
					shouldSave = true;
				}

				// Update approval status if provided
				if (approvalStatus) {
					target.approvalStatus.reviewedAt = Date.now();
					if (approvalStatus.approved === true) target.approvalStatus.approved = true;
					if (approvalStatus.denied === true) target.approvalStatus.denied = true;
					if (approvalStatus.comment) target.approvalStatus.comment = approvalStatus.comment;
					shouldSave = true;
				}

				// Set reviewer if not already set
				if (!target.reviewerId) {
					target.reviewerId = user.userId;
				}

				// Only allow original reviewer or admin to update
				if (target.reviewerId !== user.userId || user.role === "user" || user.role !== "noRole" || user.permissions.canEditUsers == false) {
					throw new ApolloError("Unauthorized: You lack permission to change this Material request you have to be the original reviewer or an admin to be able to make changes.");
				}

				const bulkOps = []; // Array for bulk operations
				const newAddition = []; // Track new items
				const newUpdate = []; // Track updated items
				const newDeletion = []; // Track deleted items

				// Handle item changes if provided
				if (Array.isArray(items)) {
					for (const item of items) {
						const { id: itemId, itemName, quantity, action } = item;

						// Add new item
						if (action.toBeAdded === true) {
							newAddition.push(item);
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $push: { items: { itemName, quantity } } },
								},
							});
						}
						// Update existing item
						else if (action.toBeUpdated && itemId) {
							newUpdate.push(item);
							bulkOps.push({
								updateOne: {
									filter: { _id: id, "items._id": itemId },
									update: {
										$set: {
											"items.$.quantity": quantity,
											"items.$.itemName": itemName,
										},
									},
								},
							});
						}
						// Delete item
						else if (action.toBeDeleted && itemId) {
							newDeletion.push(item);
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $pull: { items: { _id: itemId } } },
								},
							});
						}
					}
				}

				console.log("__________________________________________________________________________________________");

				// Save main document and perform bulk item updates in parallel
				await Promise.all([shouldSave ? target.save() : null, bulkOps.length > 0 ? MaterialRequest.bulkWrite(bulkOps) : null]);

				// Fetch updated document with populated fields
				const updatedTarget = await MaterialRequest.findById(id).populate([{ path: "requesterId" }, { path: "reviewerId" }]);

				await pubsub.publish("MATERIAL_REQUEST_UPDATED", {
					onChange: { eventType: "updated", Changes: updatedTarget }, // Publish event
				});

				return updatedTarget; // Return updated request
			} catch (error) {
				console.error("Error updating material request:", error); // Log error
				throw error; // Rethrow error
			}
		},

		// Delete a material request (admin only)
		deleteOneMaterialRequest: async (_, { id }, { user }) => {
			if (!user) throw new Error("Unauthorized: No context provided."); // Require authentication
			if (!user.permissions.canDeleteUsers) throw new ApolloError("You lack permission to delete Material request."); // Require permission

			const deletedMaterialRequest = await MaterialRequest.findByIdAndDelete(id); // Delete by ID
			if (!deletedMaterialRequest) throw new ApolloError("Material Request not found"); // Error if not found

			// Publish deletion event for subscriptions
			await pubsub.publish("MATERIAL_REQUEST_DELETED", {
				onChange: { eventType: "deleted", Changes: deletedMaterialRequest },
			});

			MaterialRequest;
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
