import { Schema, model } from "mongoose";

const MaterialRequestSchema = new Schema(
	{
		requesterId: {
			type: Schema.Types.ObjectId,
			ref: "Users",
			required: true,
			immutable: true,
		},

		description: { type: String },

		reviewerId: {
			type: Schema.Types.ObjectId,
			ref: "Users",
			immutable: true,
		},
		approvalStatus: {
			approved: { type: Boolean, default: false },
			denied: { type: Boolean, default: false },
			reviewedAt: {
				type: Date,
				default: null,
			},
			comment: { type: String },
		},

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

MaterialRequestSchema.pre("save", function (next) {
	if (this.isModified("approvalStatus.approved") && this.approvalStatus.approved && !this.approvalStatus.reviewedAt) {
		this.approvalStatus.reviewedAt = new Date();
	}
	next();
});

const MaterialRequest = model("MaterialRequest", MaterialRequestSchema);
export default MaterialRequest;
