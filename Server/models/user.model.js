// Importing Schema and model to create the schema and saving it to the database
// const { Schema, model } = require("mongoose");
import { Schema, model } from "mongoose";
import bcrypt from "bcrypt"; // Module for hashing passwords securely
// const bcrypt = require("bcrypt"); // Alternative import syntax

import { encrypt, decrypt } from "../middleware/encrypt_decrypt.js";
// Encryption/decryption middleware (not used in this snippet, but imported)

// Defining the User schema with fields and validation
const UserSchema = new Schema(
	{
		// User's full name
		name: {
			type: String,
			required: true, // Name is required
			minLength: 2, // Minimum length for validation
		},

		// User's email address
		email: {
			type: String,
			required: true, // Email is required
			unique: true, // Must be unique across users
			lowercase: true, // Automatically convert email to lowercase before saving
			validate: {
				// Custom regex validator for proper email format
				validator: function (v) {
					return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(v);
				},
				// Error message if email format is invalid
				message: (props) => `${props.value} is not a valid email address!`,
			},
		},

		// User's password (hashed before save)
		password: {
			type: String,
			required: true,
			minLength: 3, // Minimum length validation
		},

		// JWT token for authentication/session management
		token: {
			type: String,
			required: true,
		},

		// User role with enum validation and default value
		role: {
			type: String,
			enum: ["headAdmin", "admin", "subAdmin", "user", "noRole", "technician"],
			default: "user",
			required: true,
		},

		// Job information nested as an object
		job: {
			title: { type: String }, // Job title (optional)
			description: { type: String }, // Job description (optional)
		},

		// Permissions object for granular access control
		permissions: {
			canEditUsers: { type: Boolean, default: false }, // Permission to edit other users
			canDeleteUsers: { type: Boolean, default: false }, // Permission to delete other users
			canChangeRole: { type: Boolean, default: false }, // Permission to change user roles
			canViewUsers: { type: Boolean, default: false }, // Permission to view users
			canViewAllUsers: { type: Boolean, default: false }, // Permission to view all users
			canEditSelf: { type: Boolean, default: true }, // Permission to edit own profile
			canViewSelf: { type: Boolean, default: true }, // Permission to view own profile
			canDeleteSelf: { type: Boolean, default: false }, // Permission to delete own account
			canNotBeDeleted: { type: Boolean, default: false }, // Permission to not be able to be delete
			canNotBeUpdated: { type: Boolean, default: false }, // Permission to not be able to be updated
		},
	},
	{
		timestamps: true, // Automatically include createdAt and updatedAt timestamps
		toJSON: { getters: true }, // Use getters when converting to JSON (e.g., virtuals)
		toObject: { getters: true }, // Use getters when converting to plain JS objects
	}
);

// Pre-save hook to convert email to lowercase (redundant with schema lowercase option but safe)
UserSchema.pre("save", function (next) {
	if (this.isModified("email")) {
		this.email = this.email.toLowerCase();
	}
	next();
});

// Virtual field for confirmPassword (not stored in DB, used for validation)
UserSchema.virtual("confirmPassword")
	.get(function () {
		return this._confirmPassword; // Retrieve the temporary field value
	})
	.set(function (value) {
		this._confirmPassword = value; // Set the temporary field value
	});

// Pre-validation hook to ensure password and confirmPassword match
UserSchema.pre("validate", function (next) {
	if (this.isModified("password") && this.password !== this.confirmPassword) {
		this.invalidate("confirmPassword", "Password and confirm password don't match");
	}
	next();
});

// Pre-save hook to hash password before saving user document
UserSchema.pre("save", function (next) {
	// Skip hashing if password not modified
	if (!this.isModified("password")) {
		return next();
	}

	// Hash the password asynchronously with salt rounds=10
	bcrypt.hash(this.password, 10, (err, hash) => {
		if (err) {
			return next(err); // Pass error to next middleware if hashing fails
		}
		this.password = hash; // Replace plain password with hashed version
		next();
	});
});

// Create the Mongoose model named "Users" from the schema
const User = model("Users", UserSchema);

// Exporting the User model for use elsewhere in the app
export default User;

// !! no phone numbers
// cellPhones: {
// 	type: [
// 		{
// 			numberId: {
// 				type: String,
// 				// required: true
// 			},
// 			number: {
// 				type: String,
// 				required: true,
// 				validate: {
// 					validator: function (v) {
// 						// Example regex for validating US phone numbers
// 						return /\(\d{3}\)\d{3}-\d{4}/.test(v);
// 					},
// 					message: (props) => `${props.value} is not a valid phone number!`,
// 				},
// 			},
// 		},
// 	],
// 	//!! required: true,
// },
