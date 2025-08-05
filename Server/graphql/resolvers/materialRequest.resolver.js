// Importing Manager model, uuid for unique IDs, and pubsub for event publishing
import MaterialRequest from "../../models/materialRequest.model.js";
import User from "../../models/user.model.js";

import pubsub from "../pubsub.js";
// const mongoose = require("mongoose");
import mongoose from "mongoose";

const materialRequestResolvers = {
	Query: {
		hello: async () => {
			console.log("it hit");
			return "hello world";
		},

		// Get all managers - available for all users (admin and non-admin)
		getAllMaterialRequests: async (_, __) => {
			try {
				const materialRequest = await MaterialRequest.find();
				console.log("all the Material requests", materialRequest, "\n____________________");
				return materialRequest;
			} catch (err) {
				console.log("there was an error fetching all the Managers", err, "\n____________________");
				throw err;
			}
		},

		// // Get a single manager by ID - available for all users
		// getOneManager: async (_, { id }) => {
		// 	try {
		// 		const manager = await Manager.findById(id);
		// 		console.log("one Manager", manager, "\n____________________", "\n____________________", manager?.addresses?.keys[0]?._id, "\n____________________");
		// 		return manager;
		// 	} catch (err) {
		// 		console.log("there was an error fetching one Manager", err, "\n____________________");
		// 		throw err;
		// 	}
		// },
	},

	Mutation: {
		// Create a new manager - only admins can create new managers
		createONeMaterialRequest: async (_, { input: { requesterId, description, comment, items } }, { user }) => {
			// todo: you need to figure out why the users field is not being populated
			if (!user) {
				throw new Error("Unauthorized: no user context given.");
			}

			try {
				const newMaterialRequest = new MaterialRequest({
					requesterId,
					description,
					comment,
					items,
					addedDate: new Date().toISOString(),
				});

				await newMaterialRequest.save();

				//  Populate requesterId before returning
				await newMaterialRequest.populate("requesterId");

				console.log("new Material request created", newMaterialRequest, "\n____________________");

				return newMaterialRequest;
			} catch (err) {
				console.log("Error creating material request", err, "\n____________________");
				throw err;
			}
		},

		// updateOneManager: async (parent, args, { user }) => {
		// 	if (!user || user.role !== "admin") {
		// 		throw new Error("Unauthorized: Admin access required.");
		// 	}
		// 	const { id, name, addressesInfo } = args;
		// 	const update = {};
		// 	let hasUpdates = false;
		// 	console.log("Received arguments:", args);
		// 	// Update the name field if it's provided
		// 	if (name !== null && name !== undefined) {
		// 		update.name = name;
		// 		hasUpdates = true;
		// 		// console.log("Name updated:", name);
		// 	}
		// 	try {
		// 		const bulkOps = []; // Array to hold bulk operations
		// 		// Normalize addresses to an array if it's a single object
		// 		const normalizedAddresses = Array.isArray(addressesInfo) ? addressesInfo : addressesInfo ? [addressesInfo] : []; //!! this gets the info from the addressesInfo array
		// 		// console.log("Normalized addresses:", normalizedAddresses);
		// 		// Process addresses and prepare bulk operations
		// 		normalizedAddresses.forEach((address, i) => {
		// 			//!! this loops over every element on the normalized info array
		// 			console.log("adding the address info", i); //address
		// 			if (!address || !address.status) {
		// 				//!! this checks if the is actual info on the normalized info array
		// 				// console.log("Skipping invalid address:", i, address);
		// 				return; // Skip if no valid address or status
		// 			}
		// 			// Handle adding new addresses, updating, or deleting addresses (existing logic remains)
		// 			// (Add handling logic for addresses similar to your current resolver)
		// 			if (address.status === "add" && address.address && address.city && address.state && address.zipCode) {
		// 				// console.log("Adding address:", address);
		// 				// Add address first
		// 				bulkOps.push({
		// 					updateOne: {
		// 						filter: { _id: id },
		// 						update: { $push: { addresses: { ...address } } },
		// 					},
		// 				});
		// 				// Now handle keys associated with the address, if any
		// 				address.keys?.forEach((key, j) => {
		// 					console.log("adding the key info ", j);
		// 					if (key.status === "add" && key.keyWay && key.code && key.doorLocation) {
		// 						// Add the key to the address after the address is added
		// 						bulkOps.push({
		// 							updateOne: {
		// 								filter: { _id: id, "addresses.address": address.address },
		// 								update: { $push: { "addresses.$.keys": key } },
		// 							},
		// 						});
		// 					}
		// 				});
		// 			}
		// 			// Handle updating existing addresses
		// 			else if (address.status === "update" && address.addressId) {
		// 				// console.log("Updating address:", address);
		// 				// Process keys within the address for update
		// 				address.keys.forEach((key) => {
		// 					// console.log("got a key", key, "\n____________________", "\n____________________", "\n____________________");
		// 					if (key.status === "add") {
		// 						// Add key to the address using addressId
		// 						bulkOps.push({
		// 							updateOne: {
		// 								filter: { _id: id, "addresses._id": address.addressId },
		// 								update: { $push: { "addresses.$.keys": key } },
		// 							},
		// 						});
		// 					}
		// 					//TODO: the update need to be fix because is not adding the update to the keys
		// 					else if (key.status === "update" && key.keyId) {
		// 						// console.log("keys information :", key, "\n____________________", "\n____________________", "\n____________________");
		// 						// console.log("Bulk Operation Query:", JSON.stringify(bulkOps, null, 2));
		// 						bulkOps.push({
		// 							updateOne: {
		// 								// 	filter: { _id: id, "addresses._id": address.addressId, "addresses.keys._id": key.keyId }, // Match the manager //!! "address._id": address.addressId, "key._id": key.keyId
		// 								// 	update: {
		// 								// 		$set: {
		// 								// 			"keys.$.keyWay": key.keyWay,
		// 								// 			"keys.$.keyCode": key.keyCode,
		// 								// 			"keys.$.doorLocation": key.doorLocation,
		// 								// 		},
		// 								// 	},
		// 								// },
		// 								filter: { _id: id }, // Match the manager
		// 								update: {
		// 									$set: {
		// 										"addresses.$[address].keys.$[key].keyWay": key.keyWay,
		// 										"addresses.$[address].keys.$[key].keyCode": key.keyCode,
		// 										"addresses.$[address].keys.$[key].doorLocation": key.doorLocation,
		// 									},
		// 								},
		// 								arrayFilters: [
		// 									{ "address._id": address.addressId }, // Match the specific address
		// 									{ "key._id": key.keyId }, // Match the specific key
		// 								],
		// 							},
		// 						});
		// 						//TODO: the update need to be fix because is not adding the update to the keys
		// 					} else if (key.status === "delete" && key.keyId) {
		// 						// Delete key from address
		// 						bulkOps.push({
		// 							updateOne: {
		// 								filter: { _id: id, "addresses._id": address.addressId },
		// 								update: { $pull: { "addresses.$.keys": { _id: key.keyId } } },
		// 							},
		// 						});
		// 					}
		// 				});
		// 				// Update the address itself after processing keys
		// 				bulkOps.push({
		// 					updateOne: {
		// 						filter: { _id: id, "addresses._id": address.addressId },
		// 						update: {
		// 							$set: {
		// 								"addresses.$.address": address.address,
		// 								"addresses.$.city": address.city,
		// 								"addresses.$.state": address.state,
		// 								"addresses.$.zipCode": address.zipCode,
		// 							},
		// 						},
		// 					},
		// 				});
		// 			}
		// 			// Handle deleting addresses
		// 			else if (address.status === "delete" && address.addressId) {
		// 				console.log("Deleting address:", address);
		// 				bulkOps.push({
		// 					updateOne: {
		// 						filter: { _id: id },
		// 						update: { $pull: { addresses: { _id: address.addressId } } },
		// 					},
		// 				});
		// 				// If the address is deleted, delete all keys associated with it
		// 				if (address.keys) {
		// 					address.keys.forEach((key) => {
		// 						if (key.keyId) {
		// 							bulkOps.push({
		// 								updateOne: {
		// 									filter: { _id: id, "addresses._id": address.addressId },
		// 									update: { $pull: { "addresses.$.keys": { _id: key.keyId } } },
		// 								},
		// 							});
		// 						}
		// 					});
		// 				}
		// 			}
		// 		});
		// 		console.log("Bulk Operation Query:", JSON.stringify(bulkOps, null, 2));
		// 		// Execute bulk operations if any valid operations exist
		// 		if (bulkOps.length > 0) {
		// 			console.log("Executing bulk operations...");
		// 			await Manager.bulkWrite(bulkOps);
		// 			hasUpdates = true; // Flag as having performed updates
		// 			console.log("Bulk operations completed successfully.");
		// 		}
		// 		// Perform the main update if there are updates
		// 		if (hasUpdates) {
		// 			console.log("Updating manager with id:", id);
		// 			const updatedManager = await Manager.findByIdAndUpdate(id, update, { new: true });
		// 			if (!updatedManager) {
		// 				console.log("Manager not found with id:", id);
		// 				throw new Error("Manager not found");
		// 			}
		// 			pubsub.publish("MANAGER_UPDATED", {
		// 				onManagerChange: {
		// 					eventType: "MANAGER_UPDATED",
		// 					managerChanges: updatedManager,
		// 				},
		// 			});
		// 			console.log("Manager updated successfully:", updatedManager);
		// 			return updatedManager;
		// 		} else {
		// 			console.log("No valid updates provided");
		// 			return null;
		// 		}
		// 	} catch (err) {
		// 		console.error("Error updating manager", err);
		// 		throw err;
		// 	}
		// },
		// Delete manager - only admins can delete managers
		// updateOneManager: async (parent, args, { user }) => {
		// 	if (!user || user.role !== "admin") {
		// 		throw new Error("Unauthorized: Admin access required.");
		// 	}
		// 	const { id, name, addressesInfo } = args;
		// 	const update = {};
		// 	let hasUpdates = false;
		// 	console.log("Received arguments:", args);
		// 	// Update the name field if it's provided
		// 	if (name !== null && name !== undefined) {
		// 		update.name = name;
		// 		hasUpdates = true;
		// 	}
		// 	try {
		// 		const bulkOps = []; // Array to hold bulk operations
		// 		// Normalize addresses to an array if it's a single object
		// 		const normalizedAddresses = Array.isArray(addressesInfo) ? addressesInfo : addressesInfo ? [addressesInfo] : [];
		// 		console.log("Normalized addresses:", normalizedAddresses);
		// 		// Process addresses and prepare bulk operations
		// 		normalizedAddresses.forEach((address) => {
		// 			if (!address || !address.status) return; // Skip invalid addresses
		// 			// Add a new address
		// 			if (address.status === "add" && address.address && address.city && address.state && address.zipCode) {
		// 				bulkOps.push({
		// 					updateOne: {
		// 						filter: { _id: id },
		// 						update: { $push: { addresses: { ...address, _id: new mongoose.Types.ObjectId() } } },
		// 					},
		// 				});
		// 				// Add keys to the address if any
		// 				address.keys?.forEach((key) => {
		// 					if (key.status === "add" && key.keyWay && key.keyCode && key.doorLocation) {
		// 						bulkOps.push({
		// 							updateOne: {
		// 								filter: { _id: id, "addresses.address": address.address },
		// 								update: { $push: { "addresses.$.keys": { ...key, _id: new mongoose.Types.ObjectId() } } },
		// 							},
		// 						});
		// 					}
		// 				});
		// 			}
		// 			// Handle updating existing addresses
		// 			else if (address.status === "update" && address.addressId) {
		// 				// Update the address itself
		// 				if (address.address || address.city || address.state || address.zipCode)
		// 					bulkOps.push({
		// 						updateOne: {
		// 							filter: { _id: id, "addresses._id": address.addressId },
		// 							update: {
		// 								$set: {
		// 									"addresses.$.address": address.address,
		// 									"addresses.$.city": address.city,
		// 									"addresses.$.state": address.state,
		// 									"addresses.$.zipCode": address.zipCode,
		// 								},
		// 							},
		// 						},
		// 					});
		// 				// Update keys inside the address
		// 				if (address.keys) {
		// 					address.keys?.forEach((key) => {
		// 						if (key.status === "update" && key.keyId) {
		// 							// Ensure arrayFilters are applied to match the correct address and key
		// 							bulkOps.push({
		// 								updateOne: {
		// 									filter: { _id: id },
		// 									update: {
		// 										$set: {
		// 											"addresses.$[address].keys.$[key].keyWay": key.keyWay,
		// 											"addresses.$[address].keys.$[key].keyCode": key.keyCode,
		// 											"addresses.$[address].keys.$[key].doorLocation": key.doorLocation,
		// 										},
		// 									},
		// 									arrayFilters: [
		// 										{ "address._id": address.addressId }, // Match the address
		// 										{ "key._id": key.keyId }, // Match the key
		// 									],
		// 								},
		// 							});
		// 						}
		// 						// Delete key if necessary
		// 						else if (key.status === "delete" && key.keyId) {
		// 							bulkOps.push({
		// 								updateOne: {
		// 									filter: { _id: id, "addresses._id": address.addressId },
		// 									update: { $pull: { "addresses.$.keys": { _id: key.keyId } } },
		// 								},
		// 							});
		// 						}
		// 					});
		// 				}
		// 			}
		// 			// Delete an address
		// 			else if (address.status === "delete" && address.addressId) {
		// 				bulkOps.push({
		// 					updateOne: {
		// 						filter: { _id: id },
		// 						update: { $pull: { addresses: { _id: address.addressId } } },
		// 					},
		// 				});
		// 				// Delete keys if address is deleted
		// 				if (address.keys) {
		// 					address.keys.forEach((key) => {
		// 						if (key.keyId) {
		// 							bulkOps.push({
		// 								updateOne: {
		// 									filter: { _id: id, "addresses._id": address.addressId },
		// 									update: { $pull: { "addresses.$.keys": { _id: key.keyId } } },
		// 								},
		// 							});
		// 						}
		// 					});
		// 				}
		// 			}
		// 		});
		// 		// Log the bulkOps to verify the operations
		// 		console.log("Bulk Operation Query:", JSON.stringify(bulkOps, null, 2));
		// 		// Execute bulk operations if any valid operations exist
		// 		if (bulkOps.length > 0) {
		// 			console.log("Executing bulk operations...");
		// 			await Manager.bulkWrite(bulkOps);
		// 			hasUpdates = true;
		// 			console.log("Bulk operations completed successfully.");
		// 		}
		// 		// Perform the main update if there are updates
		// 		if (hasUpdates) {
		// 			console.log("Updating manager with id:", id);
		// 			const updatedManager = await Manager.findByIdAndUpdate(id, update, { new: true });
		// 			if (!updatedManager) {
		// 				console.log("Manager not found with id:", id);
		// 				throw new Error("Manager not found");
		// 			}
		// 			pubsub.publish("MANAGER_UPDATED", {
		// 				onManagerChange: {
		// 					eventType: "MANAGER_UPDATED",
		// 					managerChanges: updatedManager,
		// 				},
		// 			});
		// 			console.log("Manager updated successfully:", updatedManager);
		// 			return updatedManager;
		// 		} else {
		// 			console.log("No valid updates provided");
		// 			return null;
		// 		}
		// 	} catch (err) {
		// 		console.error("Error updating manager", err);
		// 		throw err;
		// 	}
		// },
		// deleteOneManager: async (_, { id }, { user }) => {
		// 	if (!user || user.role !== "admin") {
		// 		throw new Error("Unauthorized: Admin access required.");
		// 	}
		// 	return await Manager.findByIdAndDelete(id)
		// 		.then((deletedManager) => {
		// 			pubsub.publish("MANAGER_DELETED", {
		// 				onManagerChange: {
		// 					eventType: "MANAGER_DELETED",
		// 					managerChanges: deletedManager,
		// 				},
		// 			});
		// 			console.log("a manager was deleted", deletedManager, "\n____________________");
		// 			return deletedManager;
		// 		})
		// 		.catch((err) => {
		// 			console.log("there was an error deleting a Manager", err, "\n____________________");
		// 			throw err;
		// 		});
		// },
	},

	// Subscription: {
	// 	onMaterialRequestChange: {
	// 		subscribe: () => pubsub.asyncIterator(["MATERIAL_REQUEST_ADDED", "MATERIAL_REQUEST_UPDATED", "MATERIAL_REQUEST_DELETED"]),
	// 	},
	// },

	MaterialRequest: {
		createdAt: (materialRequest) => materialRequest.createdAt.toISOString(),
		updatedAt: (materialRequest) => materialRequest.updatedAt.toISOString(),
	},
};

export { materialRequestResolvers };
