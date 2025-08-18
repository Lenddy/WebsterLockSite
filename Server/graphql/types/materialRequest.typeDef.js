// Import the gql tag for defining GraphQL schema
import { gql } from "graphql-tag";
// Import custom DateTime scalar definition
import "../scalar/dateTime.js";

// Import user type definitions to embed in this schema
import { userTypeDef } from "./user.typeDef.js";

// Define the GraphQL type definitions for MaterialRequest and related types
const materialRequestTypeDef = gql`
	scalar DateTime
	${userTypeDef}
	# Include User type definitions

	type MaterialRequest {
		id: ID!
		requester: UserSnapshot # frozen requester info
		reviewers: [UserSnapshot] # frozen reviewer info
		description: String
		approvalStatus: ApprovalStatus
		addedDate: String
		items: [MaterialRequestItem!]!
		createdAt: String
		updatedAt: String
	}

	type PermissionSnapshot {
		canEditUsers: Boolean
		canDeleteUsers: Boolean
		canChangeRole: Boolean
		canViewUsers: Boolean
		canViewAllUsers: Boolean
		canEditSelf: Boolean
		canViewSelf: Boolean
		canDeleteSelf: Boolean
	}

	type UserSnapshot {
		userId: ID
		email: String
		name: String
		role: String
		permissions: PermissionSnapshot
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

	input Action {
		toBeAdded: Boolean
		toBeUpdated: Boolean
		toBeDeleted: Boolean
	}

	input MaterialRequestItemInput {
		quantity: Int!
		itemName: String!
	}

	input ApprovalStatusInput {
		approved: Boolean
		denied: Boolean
		reviewedAt: String
		comment: String
	}

	input UpdateMaterialRequestItemInput {
		id: ID
		quantity: Int!
		itemName: String!
		action: Action!
	}

	input CreateOneMaterialRequestInput {
		description: String
		comment: String
		items: [MaterialRequestItemInput!]!
	}

	input UpdateMaterialRequestInput {
		id: ID!
		description: String
		items: [UpdateMaterialRequestItemInput!]!
		approvalStatus: ApprovalStatusInput!
	}

	type Query {
		hello2: String
		getAllMaterialRequests: [MaterialRequest]!
		getOneMaterialRequest(id: ID!): MaterialRequest!
	}

	type Mutation {
		createONeMaterialRequest(input: CreateOneMaterialRequestInput!): MaterialRequest!
		updateOneMaterialRequest(input: UpdateMaterialRequestInput!): MaterialRequest!
		deleteOneMaterialRequest(id: ID!): MaterialRequest!
	}

	type MaterialRequestChange {
		eventType: String
		Changes: MaterialRequest!
	}

	type Subscription {
		onMaterialRequestChange: MaterialRequestChange
	}
`;

// Export the type definitions for use in the GraphQL server
export { materialRequestTypeDef };
