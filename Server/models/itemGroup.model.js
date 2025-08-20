// Importing Schema and model to create the schema and saving it to the database
// const { Schema, model } = require("mongoose");
import { Schema, model } from "mongoose";
import bcrypt from "bcrypt"; // Module for hashing passwords securely
// const bcrypt = require("bcrypt"); // Alternative import syntax

import { encrypt, decrypt } from "../middleware/encrypt_decrypt.js";
// Encryption/decryption middleware (not used in this snippet, but imported)

// Defining the item schema with fields and validation
const ItemGroupSchema = new Schema(
	{
		brand: {
			type: String,
			required: true, // Name is required
			unique: true, // Must be unique across users
		},
		// User's full name
		itemsList: [
			{
				_id: { type: Schema.Types.ObjectId, auto: true },
				itemName: { type: String }, //  Name is required
				// Must be unique across users
			},
		],
	},
	{
		timestamps: true, // Automatically include createdAt and updatedAt timestamps
		toJSON: { getters: true }, // Use getters when converting to JSON (e.g., virtuals)
		toObject: { getters: true }, // Use getters when converting to plain JS objects
	}
);

// Create the Mongoose model named "Items" from the schema
const ItemGroup = model("ItemGroups", ItemGroupSchema);

// Exporting the User model for use elsewhere in the app
export default ItemGroup;
