import { Schema, model } from "mongoose";

/**
 * Mongoose schema for a Material Request.
 *
 * @typedef {Object} MaterialRequestSchema
 * @property {ObjectId} requesterId - Reference to the user who made the request. Required and immutable.
 * @property {string} [description] - Optional description of the material request.
 * @property {ObjectId} [reviewerId] - Reference to the user who reviews the request.
 * @property {Object} approvalStatus - Status of the approval process.
 * @property {boolean} approvalStatus.approved - Indicates if the request is approved. Defaults to false.
 * @property {boolean} approvalStatus.denied - Indicates if the request is denied. Defaults to false.
 * @property {Date|null} approvalStatus.reviewedAt - Date when the request was reviewed. Defaults to null.
 * @property {string} [approvalStatus.comment] - Optional comment from the reviewer.
 * @property {Date} addedDate - Date when the request was added. Defaults to current date.
 * @property {Array<Object>} items - List of requested items.
 * @property {ObjectId} items._id - Unique identifier for each item (auto-generated).
 * @property {number} items.quantity - Quantity of the item requested. Required.
 * @property {string} items.itemName - Name of the requested item. Required.
 * @property {Date} createdAt - Timestamp when the document was created (managed by Mongoose).
 * @property {Date} updatedAt - Timestamp when the document was last updated (managed by Mongoose).
 */
const MaterialRequestSchema = new Schema(
	{
		requester: {
			userId: Schema.Types.ObjectId, // mongoose.Schema.Types.ObjectId
			name: String,
			email: {
				type: String,
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
			role: String,
			permissions: {
				canEditUsers: Boolean,
				canDeleteUsers: Boolean,
				canChangeRole: Boolean,
				canViewUsers: Boolean,
				canViewAllUsers: Boolean,
				canEditSelf: Boolean,
				canViewSelf: Boolean,
				canDeleteSelf: Boolean,
				canRegisterUser: { type: Boolean, default: false },
			},
		},

		//  reviewers snapshot (array because multiple reviewers)
		reviewers: [
			{
				userId: Schema.Types.ObjectId, // mongoose.Schema.Types.ObjectId
				name: String,
				email: {
					type: String,
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
				role: String,
				permissions: {
					canEditUsers: Boolean,
					canDeleteUsers: Boolean,
					canChangeRole: Boolean,
					canViewUsers: Boolean,
					canViewAllUsers: Boolean,
					canEditSelf: Boolean,
					canViewSelf: Boolean,
					canDeleteSelf: Boolean,
					canRegisterUser: { type: Boolean, default: false },
				},
				comment: String,
				reviewedAt: Date,
			},
		],

		approvalStatus: {
			approvedBy: {
				userId: Schema.Types.ObjectId,
				name: String,
				email: {
					type: String,
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
			},
			approvedAt: {
				type: Date,
				// default: Date.now,
			},
			isApproved: { type: Boolean, default: false },
		},

		description: { type: String },

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
		timestamps: true,
	}
);

// Example: When a user is deleted, update related MaterialRequests
// Set requesterSnapshot.deleted = true or add a deleted flag/message
// You need to implement this logic in your user deletion code, e.g.:
// await MaterialRequest.updateMany({ requesterId: userId }, { "requesterSnapshot.deleted": true });

// MaterialRequestSchema.pre("save", function (next) {
// 	if (this.isModified("approvalStatus.approved") && this.approvalStatus.approved && !this.approvalStatus.reviewedAt) {
// 		this.approvalStatus.reviewedAt = new Date();
// 	}
// 	next();
// });

const MaterialRequest = model("MaterialRequest", MaterialRequestSchema);
export default MaterialRequest;
