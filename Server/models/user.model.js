// Importing Schema and model to create the schema and saving it to the database
// const { Schema, model } = require("mongoose");
import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
// const bcrypt = require("bcrypt"); // Module for hashing passwords
import { encrypt, decrypt } from "../middleware/encrypt_decrypt.js";
// const { encrypt, decrypt } = require("../middleware/encrypt_decrypt"); // Importing encryption and decryption functions

// Defining the User schema
const UserSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			minLength: 2,
		},

		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true, // Convert email to lowercase
			validate: {
				validator: function (v) {
					return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(v); // Custom email format validation using regex
				},
				message: (props) => `${props.value} is not a valid email address!`, // Error message if validation fails
			},
		},
		password: {
			type: String,
			required: true,
			minLength: 3,
		},
		token: {
			type: String,
			required: true,
		},
		role: { type: String, enum: ["user", "admin"], default: "user" }, // Role field with default value
	},
	{
		timestamps: true, // Automatically include createdAt and updatedAt fields
		toJSON: { getters: true }, // Use getters when converting to JSON
		toObject: { getters: true }, // Use getters when converting to plain object
	}
);

// Creating a pre-save hook to convert email to lowercase
UserSchema.pre("save", function (next) {
	if (this.isModified("email")) {
		this.email = this.email.toLowerCase(); // Convert email to lowercase
	}
	next();
});

// Defining a virtual property for confirmPassword
UserSchema.virtual("confirmPassword")
	.get(function () {
		return this._confirmPassword; // Getting the value of confirmPassword
	})
	.set(function (value) {
		this._confirmPassword = value; // Setting the value of confirmPassword
	});

// Pre-validation hook to check if password and confirmPassword match
UserSchema.pre("validate", function (next) {
	if (this.isModified("password") && this.password !== this.confirmPassword) {
		this.invalidate("confirmPassword", "Password and confirm password don't match"); // Invalidating confirmPassword field if they don't match
	}
	next(); // Moving to the next middleware
});

// Pre-save hook to hash the password before saving to the database
UserSchema.pre("save", function (next) {
	if (!this.isModified("password")) {
		return next(); // If not modified, move to the next middleware
	}

	bcrypt.hash(this.password, 10, (err, hash) => {
		if (err) {
			return next(err); // Handling error if hashing fails
		}
		this.password = hash; // Setting the hashed password
		next(); // Moving to the next middleware
	});
});

// Creating a User model from the schema
const User = model("Users", UserSchema);

export default User; // Exporting the User model
