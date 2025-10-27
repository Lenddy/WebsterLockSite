// Import necessary modules and models
import { ApolloError } from "apollo-server-errors"; // For GraphQL error handling
import MaterialRequest from "../../models/materialRequest.model.js"; // Mongoose model for MaterialRequest
import pubsub from "../pubsub.js"; // PubSub instance for subscriptions
import dayjs from "dayjs";

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

		getAllMaterialRequests: async (_, __, { user }) => {
			try {
				if (!user) throw new Error("Unauthorized: No user token was found.");

				// Admins can view all
				const isAdmin = ["headAdmin", "admin", "subAdmin"].includes(user.role);

				const query = isAdmin ? {} : { "requester.userId": user.userId };

				const materialRequests = await MaterialRequest.find(query);

				return materialRequests;
			} catch (error) {
				console.log("Error fetching user's material requests:", error);
				throw error;
			}
		},

		// // Fetch a single material request by ID (admin only)
		// getOneMaterialRequest: async (_, { id }, { user }) => {
		// 	try {
		// 		if (!user) throw new ApolloError("Unauthorized: No user token was found."); // Require authentication
		// 		if (!user.permissions.canViewAllUsers) throw new ApolloError("Unauthorized: You do not have permission to view Material Requests."); // Require permission

		// 		// Find by ID and populate fields
		// 		const materialRequest = await MaterialRequest.findById(id);

		// 		return materialRequest; // Return result
		// 	} catch (err) {
		// 		console.log("there was an error fetching one Material request", err, "\n____________________"); // Log error
		// 		throw err; // Rethrow error
		// 	}
		// },

		getOneMaterialRequest: async (_, { id }, { user }) => {
			try {
				if (!user) throw new Error("Unauthorized: No user token was found.");

				const materialRequest = await MaterialRequest.findById(id);
				if (!materialRequest) throw new Error("Material Request not found.");

				const isAdmin = ["headAdmin", "admin", "subAdmin"].includes(user.role);

				// Convert both sides to string for a reliable match
				if (!isAdmin && String(materialRequest.requester.userId) !== String(user.userId)) {
					throw new Error("Unauthorized: You do not have permission to view this request.");
				}

				// console.log("Authorized user, returning request:", materialRequest);
				return materialRequest;
			} catch (error) {
				console.error("Error fetching one Material Request:", error);
				throw error;
			}
		},
	},

	// Mutation resolvers
	Mutation: {
		createOneMaterialRequest: async (_, { input: { description, items } }, { user }) => {
			// Check if user context is provided (authentication)
			if (!user) throw new ApolloError("Unauthorized: no user context given.");

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
					employeeNum: user.employeeNum,
					department: user.department,
					role: user.role, // Role of requester
					permissions: { ...user.permissions }, // Permissions of requester (shallow copy)
				};

				// Create a new MaterialRequest document
				const newMaterialRequest = new MaterialRequest({
					requester, // Store frozen requester info
					reviewers: [], // Initialize reviewers array as empty
					description, // Set description from input
					items: normalizedItems, // Set normalized items array
					addedDate: dayjs().toISOString(), // Set creation date as ISO string
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

		createMultipleMaterialRequests: async (_, { inputs }, { user }) => {
			// Still check that a valid logged-in user is making the call
			console.log("inputs from the front end ?");
			console.dir(inputs, { depth: null });
			if (!user) throw new ApolloError("Unauthorized: no user context given.");

			try {
				// Map over inputs (array of requests with their own requester info)
				const materialRequests = inputs.map(({ requester, description, items, addedDate }) => {
					// Normalize items for each request
					const normalizedItems = items.map((item) => ({
						itemName: item.itemName,
						quantity: item.quantity,
						itemDescription: item?.itemDescription ?? null,
						color: item?.color ?? null,
						side: item?.side ?? null,
						size: item?.size ?? null,
					}));

					// Build a new request
					return {
						requester: {
							userId: requester.userId,
							email: requester.email,
							name: requester.name,
							employeeNum: requester.employeeNum,
							department: requester.department,
							role: requester.role,
							permissions: { ...requester.permissions },
						},
						reviewers: [],
						description,
						items: normalizedItems,
						addedDate: addedDate,
					};
				});

				// Insert them all at once
				const createdRequests = await MaterialRequest.insertMany(materialRequests);

				// Publish subscription events for each created request
				for (const request of createdRequests) {
					await pubsub.publish("MATERIAL_REQUEST_ADDED", {
						onMaterialRequestChange: { eventType: "created", Changes: request },
					});
				}

				return createdRequests;
			} catch (err) {
				console.log("Error creating many material requests", err, "\n____________________");
				throw err;
			}
		},

		updateOneMaterialRequest: async (_, { input: { id, description, items, approvalStatus, comment, requesterId } }, { user, pubsub }) => {
			console.log("users id ", user.userId);
			console.log("requesters info", requesterId);
			try {
				if (!user) throw new ApolloError("Unauthorized: No user context.");

				//! here  it is saying that even if the id of the users and the requester match it will not work because  of the validation checking if they have permission to edit other users      find a solution to this
				if ((!user.permissions.canEditUsers && user.role === "user") || user.role === "noRole" || (!user.permissions.canEditUsers && user.userId !== requesterId)) {
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
					console.log("request was approved?", approvalStatus?.isApproved);
					target.approvalStatus.approvedBy.userId = user.userId;
					target.approvalStatus.approvedBy.name = user.name;
					target.approvalStatus.approvedBy.email = user.email;
					target.approvalStatus.approvedBy.employeeNum = user.employeeNum;
					target.approvalStatus.approvedBy.department = user.department;
					target.approvalStatus.approvedAt = target.approvalStatus.approvedAt ? target.approvalStatus.approvedAt : Date.now();
					target.approvalStatus.isApproved = approvalStatus.isApproved;
					shouldSave = true;
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

				//  you need to make sure that if the  material request is approved the techs (none admins cant keeps changing their request)
				// the condition bellow must be change so that it checks if the  request has been approved or not  to check if the users id is === to the requesters id
				const isAdmin = user.UserId === requesterId || user.permissions.canEditUsers || user.role === "headAdmin";
				if (!isReviewer && !isAdmin) {
					throw new ApolloError("Unauthorized: You lack permission to update this request.");
				}

				const bulkOps = [];

				if (Array.isArray(items)) {
					for (const item of items) {
						const { id: itemId, itemName, quantity, itemDescription, color, side, size, action } = item;

						if (action.toBeAdded === true) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $push: { items: { quantity, itemName, itemDescription, color, side, size } } },
								},
							});
						} else if (action.toBeUpdated === true && itemId) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id, "items._id": itemId },
									update: { $set: { "items.$.quantity": quantity, "items.$.itemName": itemName, "items.$.itemDescription": itemDescription, "items.$.color": color, "items.$.side": side, "items.$.size": size } },
								},
							});
						} else if (action.toBeDeleted === true && itemId) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $pull: { items: { _id: itemId } } },
								},
							});
						}
					}
				}

				console.dir(target, { depth: null });

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

		updateMultipleMaterialRequests: async (_, { inputs }, { user, pubsub }) => {
			if (!user) throw new ApolloError("Unauthorized: No user context.");

			if (!Array.isArray(inputs) || inputs.length === 0) {
				throw new ApolloError("No inputs provided for update.");
			}

			const bulkOps = [];
			const requestIds = inputs.map((i) => i.id);

			// Fetch all targets in one go
			const targets = await MaterialRequest.find({ _id: { $in: requestIds } });
			const targetsMap = Object.fromEntries(targets.map((t) => [t._id.toString(), t]));

			for (const input of inputs) {
				const { id, description, items, approvalStatus, comment } = input;
				const target = targetsMap[id];
				if (!target) continue;

				// Prepare $set updates for description, approvalStatus, reviewers
				const updateSet = {};

				// Description update
				if (description) updateSet.description = description;

				// Approval update
				if (approvalStatus?.isApproved) {
					updateSet.approvalStatus.isApproved = true;
					updateSet.approvalStatus.approvedBy.userId = user.userId;
					updateSet.approvalStatus.approvedBy.name = user.name;
					updateSet.approvalStatus.approvedBy.email = user.email;
					updateSet.approvalStatus.approvedBy.employeeNum = user.employeeNum;
					updateSet.approvalStatus.approvedBy.department = user.department;
					updateSet.approvalStatus.approvedAt = Date.now();
				}

				// Reviewers: merge existing and new comment/reviewer
				const existingReviewer = target.reviewers.find((r) => r.userId.toString() === user.userId.toString());
				const updatedReviewers = [...target.reviewers];

				if (!existingReviewer) {
					updatedReviewers.push({
						userId: user.userId,
						email: user.email,
						name: user.name,
						role: user.role,
						employeeNum: user.employeeNum,
						department: user.department,
						permissions: { ...user.permissions },
						comment: comment || undefined,
						reviewedAt: new Date(),
					});
				} else if (comment) {
					existingReviewer.comment = comment;
					existingReviewer.reviewedAt = new Date();
				}

				updateSet.reviewers = updatedReviewers;

				// First, handle description/reviewer/approval updates
				bulkOps.push({
					updateOne: { filter: { _id: id }, update: { $set: updateSet } },
				});

				// Handle items: add/update/delete
				if (Array.isArray(items)) {
					for (const item of items) {
						const { id: itemId, itemName, quantity, color, side, size, itemDescription, action } = item;

						if (action.toBeAdded) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id },
									update: { $push: { items: { quantity, itemName, itemDescription, color, side, size } } },
								},
							});
						} else if (action.toBeUpdated && itemId) {
							bulkOps.push({
								updateOne: {
									filter: { _id: id, "items._id": itemId },
									update: {
										$set: {
											"items.$.quantity": quantity,
											"items.$.itemName": itemName,
											"items.$.itemDescription": itemDescription,
											"items.$.color": color,
											"items.$.side": side,
											"items.$.size": size,
										},
									},
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
			}

			if (bulkOps.length > 0) {
				await MaterialRequest.bulkWrite(bulkOps); // SINGLE call for all requests
			} else {
				throw new ApolloError("No updates were required.");
			}

			// Fetch updated records in one query
			const updatedRequests = await MaterialRequest.find({ _id: { $in: requestIds } });

			// Publish events
			updatedRequests.forEach((r) =>
				pubsub.publish("MATERIAL_REQUEST_UPDATED", {
					onMaterialRequestChange: { eventType: "updated", Changes: r },
				})
			);

			return updatedRequests;
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

		// Delete multiple material requests (admin only)
		deleteMultipleMaterialRequests: async (_, { ids }, { user, pubsub }) => {
			try {
				// Authentication check
				if (!user) throw new ApolloError("Unauthorized: No context provided.");
				if (!user.permissions.canDeleteUsers) throw new ApolloError("You lack permission to delete Material requests.");

				if (!Array.isArray(ids) || ids.length === 0) {
					throw new ApolloError("No IDs provided for deletion.");
				}

				// Fetch all material requests to delete
				const requestsToDelete = await MaterialRequest.find({ _id: { $in: ids } });

				if (requestsToDelete.length === 0) {
					throw new ApolloError("No Material Requests found for the provided IDs.");
				}

				// Delete all at once using deleteMany
				await MaterialRequest.deleteMany({ _id: { $in: ids } });

				// Publish deletion events for subscriptions
				for (const request of requestsToDelete) {
					await pubsub.publish("MATERIAL_REQUEST_DELETED", {
						onMaterialRequestChange: { eventType: "deleted", Changes: request },
					});
				}

				// Return the deleted requests
				return requestsToDelete;
			} catch (error) {
				console.error("Error deleting multiple material requests:", error);
				throw error;
			}
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
