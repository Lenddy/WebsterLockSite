// Importing Schema and model to create the schema and saving it to the database
import { Schema, model } from "mongoose";
// const { Schema, model } = require("mongoose");

const ManagerSchema = new Schema(
	{
		// Attributes for the database
		name: {
			type: String,
			required: true,
			min: [2, "Name Of The Manager Must Be At Least 2 Characters Long"],
		},

		addresses: {
			type: [
				{
					address: String,
					city: String,
					state: String,
					zipCode: String,
					keys: {
						type: [
							{
								keyWay: String,
								keyCode: String,
								doorLocation: String,
							},
						],
					},
				},
			],
			required: true,
		},
	},
	{ timestamps: true }
);

const Manager = model("Managers", ManagerSchema); // Naming the table(document) in the database

export default Manager; // Exporting the schema

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
