// import { gql } from "apollo-server-express";
import { gql } from "graphql-tag";
// const { gql } = require("apollo-server-express");
import "../scalar/dateTime.js";

// require("../scalar/dateTime");

const materialRequestTypeDef = gql`
	scalar DateTime

	type MaterialRequest {
		id: ID!
		requesterId: User!
		reviewerId: User
		description: String
		comment: String
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

	type User {
		id: ID!
		name: String
	}

	input MaterialRequestItemInput {
		itemName: String!
		quantity: Int!
	}

	input CreateOneMaterialRequestInput {
		requesterId: ID!
		description: String
		comment: String
		items: [MaterialRequestItemInput!]!
	}

	input UpdateMaterialRequestInput {
		id: ID!
		reviewerId: ID
		description: String
		comment: String
		items: [MaterialRequestItemInput!]
	}

	type Query {
		getAllMaterialRequests: [MaterialRequest]!
		materialRequest(id: ID!): MaterialRequest
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
