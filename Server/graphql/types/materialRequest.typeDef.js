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

	# Main type representing a material request
	type MaterialRequest {
		id: ID!
		requesterId: User! # User who made the request
		reviewerId: User # User who reviewed the request (optional)
		description: String # Description of the request
		approvalStatus: ApprovalStatus # Approval status object
		addedDate: String # Date the request was added
		items: [MaterialRequestItem!]! # List of requested items
		createdAt: String # Timestamp of creation
		updatedAt: String # Timestamp of last update
	}

	# Type representing an item in a material request
	type MaterialRequestItem {
		id: ID!
		itemName: String! # Name of the item
		quantity: Int! # Quantity requested
	}

	# Type representing approval status of a request
	type ApprovalStatus {
		approved: Boolean # Whether approved
		denied: Boolean # Whether denied
		reviewedAt: String # When reviewed
		comment: String # Reviewer comment
	}

	input Action {
		toBeAdded: Boolean
		toBeUpdated: Boolean
		toBeDeleted: Boolean
	}

	# Input type for creating/updating a material request item
	input MaterialRequestItemInput {
		quantity: Int!
		itemName: String!
		# action: Action           # (Commented out) Possible future action field
	}

	input ApprovalStatusInput {
		approved: Boolean # Whether approved
		denied: Boolean # Whether denied
		reviewedAt: String # When reviewed
		comment: String # Reviewer comment
	}

	input UpdateMaterialRequestItemInput {
		id: ID
		quantity: Int!
		itemName: String!
		action: Action!
	}

	# Input type for creating a new material request
	input CreateOneMaterialRequestInput {
		# requesterId: ID!         # (Commented out) Requester ID, possibly set server-side
		description: String
		comment: String
		items: [MaterialRequestItemInput!]!
	}

	# Input type for updating an existing material request
	input UpdateMaterialRequestInput {
		id: ID!
		description: String
		items: [UpdateMaterialRequestItemInput!]!
		approvalStatus: ApprovalStatusInput!
	}

	# Queries for fetching material requests
	type Query {
		getAllMaterialRequests: [MaterialRequest]! # Get all requests
		getOneMaterialRequest(id: ID!): MaterialRequest! # Get a single request by ID
	}

	# Mutations for creating, updating, and deleting material requests
	type Mutation {
		createONeMaterialRequest(input: CreateOneMaterialRequestInput!): MaterialRequest!
		updateOneMaterialRequest(input: UpdateMaterialRequestInput!): MaterialRequest!
		deleteOneMaterialRequest(id: ID!): Boolean!
	}

	# # (Commented out) Types for subscriptions and actions, for future use
	# type Change {
	# 	eventType: String # Type of change (e.g., "created", "updated", "deleted")
	# 	Changes: MaterialRequest! # Updated user object after the change
	# }

	# type Subscription {
	# 	onMaterialRequestChange: Change
	# }
`;

// Export the type definitions for use in the GraphQL server
export { materialRequestTypeDef };
