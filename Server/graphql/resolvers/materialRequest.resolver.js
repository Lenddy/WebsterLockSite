// Import necessary modules and models
import { ApolloError } from "apollo-server-errors"; // For GraphQL error handling
import MaterialRequest from "../../models/materialRequest.model.js"; // Mongoose model for MaterialRequest
import pubsub from "../pubsub.js"; // PubSub instance for subscriptions
import dayjs from "dayjs";
import { withFilter } from "graphql-subscriptions";
import cloneDeep from "lodash.clonedeep";

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
				// console.log("this is the payload", newMaterialRequest);

				const payload = {
					...newMaterialRequest.toObject(),
					id: newMaterialRequest._id.toString(),
					items: newMaterialRequest.items.map((item) => ({
						id: item._id.toString(),
						itemName: item.itemName,
						quantity: item.quantity,
						itemDescription: item.itemDescription ?? null,
						color: item.color ?? null,
						side: item.side ?? null,
						size: item.size ?? null,
					})),
				};

				// console.log("the id that is send ", payload.id);

				await pubsub.publish("MATERIAL_REQUEST_ADDED", {
					onMaterialRequestChange: { eventType: "created", changeType: "single", change: payload },
				});

				// // Publish a subscription event for material request creation
				// await pubsub.publish("MATERIAL_REQUEST_ADDED", {
				// 	onMaterialRequestChange: { eventType: "created", Changes: newMaterialRequest }, // Event payload
				// });

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
			if (!user) throw new ApolloError("Unauthorized: no user context given.");

			try {
				const materialRequests = inputs.map(({ requester, description, items, addedDate }) => {
					const normalizedItems = items.map((item) => ({
						itemName: item.itemName ?? null,
						quantity: item.quantity ?? 0,
						itemDescription: item.itemDescription ?? null,
						color: item.color ?? null,
						side: item.side ?? null,
						size: item.size ?? null,
					}));

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
						// addedDate: addedDate ? new Date(addedDate)?.toISOString() : Date?.toISOString(),
						addedDate: dayjs(addedDate || undefined).toISOString(),
					};
				});

				const createdRequests = await MaterialRequest.insertMany(materialRequests);

				// Build array payload (serialize all requests properly)
				const payloadArray = createdRequests.map((request) => ({
					...request.toObject(),
					id: request._id.toString(),
					items: request.items.map((item) => ({
						id: item._id?.toString?.() ?? null,
						itemName: item.itemName ?? null,
						quantity: item.quantity ?? 0,
						itemDescription: item.itemDescription ?? null,
						color: item.color ?? null,
						side: item.side ?? null,
						size: item.size ?? null,
					})),
				}));

				const changeType = createdRequests.length > 1 ? "multiple" : "single";
				// console.log("length", changeType);
				// console.log("this is the info", payloadArray);

				const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

				// Publish a single event with all of them
				await pubsub.publish("MATERIAL_REQUEST_ADDED", {
					onMaterialRequestChange: {
						eventType: "created",
						changeType: changeType,
						// changes: changes,
						//if changeType ==="multiple" the field is changes if not is change
						...(changeType === "multiple" ? { changes: changes } : { change: changes }),
					},
				});

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
					target.approvalStatus.approvedAt = target.approvalStatus.approvedAt ? target.approvalStatus.approvedAt : dayjs().toISOString();
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

				// Fetch updated document
				const updatedTarget = await MaterialRequest.findById(id);

				// Convert it to a pure JSON-safe object
				const payload = {
					...updatedTarget.toObject(),
					id: updatedTarget._id.toString(),
					items: updatedTarget.items.map((item) => ({
						id: item._id.toString(),
						itemName: item.itemName,
						quantity: item.quantity,
						itemDescription: item.itemDescription ?? null,
						color: item.color ?? null,
						side: item.side ?? null,
						size: item.size ?? null,
					})),
				};

				// Publish the update event through RedisPubSub
				await pubsub.publish("MATERIAL_REQUEST_UPDATED", {
					onMaterialRequestChange: {
						eventType: "updated",
						changeType: "single",
						change: payload,
					},
				});

				return updatedTarget;
			} catch (error) {
				console.error("Error updating material request:", error);
				throw error;
			}
		},

		updateMultipleMaterialRequests: async (_, { inputs }, { user, pubsub }) => {
			// !!!!!!!! use dayjs  for dates

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

			// Prepare payload array (JSON-safe)
			const payloadArray = updatedRequests.map((r) => ({
				...r.toObject(),
				id: r._id.toString(),
				items: r.items.map((item) => ({
					id: item._id.toString(),
					itemName: item.itemName,
					quantity: item.quantity,
					itemDescription: item.itemDescription ?? null,
					color: item.color ?? null,
					side: item.side ?? null,
					size: item.size ?? null,
				})),
			}));

			const changeType = updatedRequests.length > 1 ? "multiple" : "single";
			// console.log("length", changeType);
			// console.log("this is the info", payloadArray);

			const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

			// Publish as a single bulk event
			await pubsub.publish("MATERIAL_REQUEST_UPDATED", {
				onMaterialRequestChange: {
					eventType: "updated",
					changeType: changeType,
					...(changeType === "multiple" ? { changes: changes } : { change: changes }),
				},
			});

			return updatedRequests;
		},

		// Delete a material request (admin only)
		deleteOneMaterialRequest: async (_, { id }, { user }) => {
			if (!user) throw new ApolloError("Unauthorized: No context provided."); // Require authentication
			if (!user.permissions.canDeleteUsers) throw new ApolloError("You lack permission to delete Material request."); // Require permission

			const deletedMaterialRequest = await MaterialRequest.findByIdAndDelete(id);
			if (!deletedMaterialRequest) throw new ApolloError("Material Request not found");

			// Prepare JSON-safe payload
			const payload = {
				...deletedMaterialRequest.toObject(),
				id: deletedMaterialRequest._id.toString(),
				items: deletedMaterialRequest.items.map((item) => ({
					id: item._id.toString(),
					itemName: item.itemName,
					quantity: item.quantity,
					itemDescription: item.itemDescription ?? null,
					color: item.color ?? null,
					side: item.side ?? null,
					size: item.size ?? null,
				})),
			};

			// Publish deletion event for subscriptions
			await pubsub.publish("MATERIAL_REQUEST_DELETED", {
				onMaterialRequestChange: {
					eventType: "deleted",
					changeType: "single",
					change: payload,
				},
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

				// Delete all at once
				await MaterialRequest.deleteMany({ _id: { $in: ids } });

				// Prepare JSON-safe payloads
				const payloadArray = requestsToDelete.map((req) => ({
					...req.toObject(),
					id: req._id.toString(),
					items: req.items.map((item) => ({
						id: item._id.toString(),
						itemName: item.itemName,
						quantity: item.quantity,
						itemDescription: item.itemDescription ?? null,
						color: item.color ?? null,
						side: item.side ?? null,
						size: item.size ?? null,
					})),
				}));

				const changeType = MaterialRequest.length > 1 ? "multiple" : "single";
				// console.log("length", changeType);
				// console.log("this is the info", payloadArray);

				const changes = changeType === "multiple" ? payloadArray : payloadArray[0];

				// Publish one event for all deletions
				await pubsub.publish("MATERIAL_REQUEST_DELETED", {
					onMaterialRequestChange: {
						eventType: "deleted",
						changeType: changeType,
						...(changeType === "multiple" ? { changes: changes } : { change: changes }),
					},
				});

				// Return the deleted requests
				return requestsToDelete;
			} catch (error) {
				console.error("Error deleting multiple material requests:", error);
				throw error;
			}
		},
	},

	Subscription: {
		onMaterialRequestChange: {
			subscribe: withFilter(
				//  pubsub.asyncIterator
				// pubsub.asyncIterableIterator
				() => pubsub.asyncIterableIterator(["MATERIAL_REQUEST_ADDED", "MATERIAL_REQUEST_UPDATED", "MATERIAL_REQUEST_DELETED"]),
				(payload, variables, context) => {
					const { user } = context;
					if (!user) return false;

					const eventData = cloneDeep(payload.onMaterialRequestChange);

					// Admins always see everything
					if (["headAdmin", "admin", "subAdmin"].includes(user.role)) return true;

					// Non-admins see only their requests
					if (eventData.change && !Array.isArray(eventData.change)) {
						return eventData.change.requester?.userId === user.userId;
					}

					if (Array.isArray(eventData.changes)) {
						const filtered = eventData.changes.filter((req) => req?.requester?.userId === user.userId);
						eventData.changes = filtered;
						return filtered.length > 0;
					}

					return false;
				}
			),

			resolve: (payload, args, context) => {
				const { user } = context;
				const cloned = cloneDeep(payload.onMaterialRequestChange);

				// Admins see everything
				if (["headAdmin", "admin", "subAdmin"].includes(user.role)) {
					return cloned;
				}

				// Non-admins only see their own changes
				if (Array.isArray(cloned.changes)) {
					cloned.changes = cloned.changes.filter((r) => r?.requester?.userId === user.userId);
				} else if (cloned.change && cloned.change.requester) {
					if (cloned.change.requester.userId !== user.userId) {
						// Instead of returning null, return a safe empty object
						return { ...cloned, changes: [] };
					}
				}

				// Always return something valid
				if (!cloned.change && !cloned.changes) {
					return { changes: [] };
				}

				return cloned;
			},
		},

		// onMaterialRequestChange: {
		// 	subscribe: withFilter(
		// 		() => pubsub.asyncIterator(["MATERIAL_REQUEST_ADDED", "MATERIAL_REQUEST_UPDATED", "MATERIAL_REQUEST_DELETED"]),
		// 		(payload, variables, context) => {
		// 			const { user } = context;
		// 			if (!user) return false;

		// 			// clone to avoid cross-reference mutations
		// 			const eventData = cloneDeep(payload.onMaterialRequestChange);

		// 			//  Admins always see everything
		// 			if (["headAdmin", "admin", "subAdmin"].includes(user.role)) return true;

		// 			//  Normalize single vs array payloads
		// 			const changes = Array.isArray(eventData.changes) ? eventData.changes : eventData.change ? [eventData.change] : [];

		// 			//  Non-admins: only see events with their own userId
		// 			return changes.some((req) => req?.requester?.userId === user.userId);
		// 		}
		// 	),

		// 	resolve: (payload, args, context) => {
		// 		const { user } = context;
		// 		const cloned = cloneDeep(payload.onMaterialRequestChange);

		// 		if (["headAdmin", "admin", "subAdmin"].includes(user.role)) return cloned;

		// 		const allChanges = Array.isArray(cloned.changes) ? cloned.changes : cloned.change ? [cloned.change] : [];

		// 		cloned.changes = allChanges.filter((req) => req?.requester?.userId === user.userId);

		// 		// Always return a valid object
		// 		if (!cloned.changes.length) cloned.changes = [];

		// 		return cloned;
		// 	},
		// },
	},

	// Field resolvers for MaterialRequest type
	MaterialRequest: {
		// Format createdAt as ISO string
		createdAt: (materialRequest) => materialRequest?.createdAt?.toISOString(),
		// Format updatedAt as ISO string
		updatedAt: (materialRequest) => materialRequest?.updatedAt?.toISOString(),
	},
};

export { materialRequestResolvers };
