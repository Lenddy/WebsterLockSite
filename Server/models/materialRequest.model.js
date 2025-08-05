// Importing Schema and model to create the schema and saving it to the database
import { Schema, model } from "mongoose";
// const { Schema, model } = require("mongoose");

const MaterialRequestSchema = new Schema(
	{
		requesterId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		reviewerId: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		description: String,
		comment: String,
		addedDate: {
			type: Date,
			default: Date.now,
		},
		items: [
			{
				_id: { type: Schema.Types.ObjectId, auto: true },
				quantity: { type: Number, required: true },
				itemName: { type: String, required: true },
			},
		],
	},
	{
		timestamps: true, // still keeps createdAt & updatedAt too
	}
);

// Exporting model
const MaterialRequest = model("MaterialRequest", MaterialRequestSchema);
export default MaterialRequest;

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
