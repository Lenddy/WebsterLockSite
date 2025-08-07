// import { gql } from "apollo-server-express";
import { gql } from "graphql-tag";
// const { gql } = require("apollo-server-express");
import "../scalar/dateTime.js";

import { userTypeDef } from "./user.typeDef.js";

const materialRequestTypeDef = gql`
	scalar DateTime
	${userTypeDef}

	type MaterialRequest {
		id: ID!
		requesterId: User!
		reviewerId: User
		description: String
		comment: String
		approvalStatus: ApprovalStatus
		addedDate: String
		items: [MaterialRequestItem!]!
		createdAt: String
		updatedAt: String
	}

	type MaterialRequestItem {
		id: ID!
		itemName: String!
		quantity: Int!
	}

	type ApprovalStatus {
		approved: Boolean
		denied: Boolean
		reviewedAt: String
		comment: String
	}

	input MaterialRequestItemInput {
		quantity: Int!
		itemName: String!
	}

	input CreateOneMaterialRequestInput {
		# requesterId: ID!
		description: String
		comment: String
		items: [MaterialRequestItemInput!]!
	}

	input UpdateMaterialRequestInput {
		id: ID!
		description: String
		comment: String
		items: [MaterialRequestItemInput!]
	}

	type Query {
		getAllMaterialRequests: [MaterialRequest]!
		getOneMaterialRequest(id: ID!): MaterialRequest!
	}

	type Mutation {
		createONeMaterialRequest(input: CreateOneMaterialRequestInput!): MaterialRequest!
		updateOneMaterialRequest(input: UpdateMaterialRequestInput!): MaterialRequest!
		deleteOneMaterialRequest(id: ID!): Boolean!
	}

	# # Used in subscriptions to indicate type of change and changed user
	# type Change {
	# 	eventType: String # Type of change (e.g., "created", "updated", "deleted")
	# 	Changes: MaterialRequest! # Updated user object after the change
	# }

	# # Re-renders data on data update
	# type Subscription {
	# 	onMaterialRequestChange: Change
	# }
`;

export { materialRequestTypeDef };
