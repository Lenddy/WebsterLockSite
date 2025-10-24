// Import the gql tag for defining GraphQL schema
import { gql } from "graphql-tag";
// Import custom DateTime scalar definition
import "../scalar/dateTime.js";

// Import user type definitions to embed in this schema
import { userTypeDef } from "../types/user.typeDef.js";

// Define the GraphQL type definitions for MaterialRequest and related types
const materialRequestTypeDef = gql`
	scalar DateTime # Custom scalar for date-time values

	${userTypeDef}
	# Include User type definitions

	# --- MaterialRequest and related types ---
	type MaterialRequest { # Main request type
		id: ID!
		requester: UserSnapshot # frozen requester info
		reviewers: [UserReviewerSnapshot] # frozen reviewer info
		approvalStatus: ApprovalStatus # approval status object
		description: String # request description
		addedDate: String # date added
		items: [MaterialRequestItem!]! # requested items
		createdAt: String # creation timestamp
		updatedAt: String # update timestamp
	}

	type MaterialRequestItem { # Item in a material request
		id: ID!
		itemName: String!
		quantity: Int!
		itemDescription: String
		color: String
		side: String
		size: String
	}

	input MaterialRequestItemInput { # Input for creating an item
		quantity: Int!
		itemName: String!
		itemDescription: String
		color: String
		side: String
		size: String
	}

	input UpdateMaterialRequestItemInput { # Input for updating an item
		id: ID
		quantity: Int
		itemName: String
		itemDescription: String
		color: String
		side: String
		size: String
		action: Action!
	}

	input createOneMaterialRequestInput { # Input for creating a request
		items: [MaterialRequestItemInput!]!
		description: String
	}

	input UpdateMaterialRequestInput { # Input for updating a request
		id: ID!
		description: String
		items: [UpdateMaterialRequestItemInput]
		approvalStatus: ApprovalStatusInput
		comment: String
		requesterId: ID
	}

	input MaterialRequestItemDescriptionInput { # Item in a material request
		id: ID!
		itemDescription: String
	}

	input UpdateMaterialRequestItemDescriptionInput { # Input for updating a request
		id: ID!
		items: [MaterialRequestItemDescriptionInput]
	}

	# --- Approval related types ---
	type ApprovalStatus { # Approval status object
		approvedBy: ApprovedBy # who approved
		approvedAt: String # approval date
		isApproved: Boolean # approval flag
	}

	type ApprovedBy { # Who approved
		userId: ID
		email: String
		name: String
	}

	input ApprovalStatusInput { # Input for approval status
		approvedBy: ApprovedByInput
		approvedAt: String
		isApproved: Boolean
	}

	input ApprovedByInput { # Input for approved by
		userId: ID
		email: String
		name: String
	}

	# --- User snapshot types ---
	type UserSnapshot { # Frozen requester info
		userId: ID
		email: String
		name: String

		role: String
		permissions: PermissionSnapshot
	}

	type UserReviewerSnapshot { # Frozen reviewer info
		userId: ID
		email: String
		name: String
		role: String
		permissions: PermissionSnapshot
		comment: String
		reviewedAt: String
	}

	# --- Permissions ---
	type PermissionSnapshot { # Permissions at time of request
		canEditUsers: Boolean
		canDeleteUsers: Boolean
		canChangeRole: Boolean
		canViewUsers: Boolean
		canViewAllUsers: Boolean
		canEditSelf: Boolean
		canViewSelf: Boolean
		canDeleteSelf: Boolean
		canRegisterUser: Boolean
	}

	input PermissionSnapshotInput { # Permissions at time of request
		canEditUsers: Boolean
		canDeleteUsers: Boolean
		canChangeRole: Boolean
		canViewUsers: Boolean
		canViewAllUsers: Boolean
		canEditSelf: Boolean
		canViewSelf: Boolean
		canDeleteSelf: Boolean
		canNotBeUpdated: Boolean
		canRegisterUser: Boolean
	}

	# --- Action input ---
	input Action { # Action to perform on item
		toBeAdded: Boolean
		toBeUpdated: Boolean
		toBeDeleted: Boolean
	}

	input RequesterInput {
		userId: ID!
		email: String!
		name: String!
		role: String!
		permissions: PermissionSnapshotInput
	}

	input createdManyMaterialRequestInput {
		requester: RequesterInput!
		description: String
		items: [MaterialRequestItemInput!]!
		addedDate: String
	}

	# --- Queries ---
	type Query {
		hello2: String # Test query
		getAllMaterialRequests: [MaterialRequest]! # Get all requests
		getOneMaterialRequest(id: ID!): MaterialRequest! # Get one request by ID
	}

	# --- Mutations ---
	type Mutation {
		createOneMaterialRequest(input: createOneMaterialRequestInput!): MaterialRequest! # Create request
		createMultipleMaterialRequests(inputs: [createdManyMaterialRequestInput!]!): [MaterialRequest!]! # Create many requests
		updateOneMaterialRequest(input: UpdateMaterialRequestInput!): MaterialRequest! # Update request
		updateMultipleMaterialRequests(inputs: [UpdateMaterialRequestInput!]!): [MaterialRequest!]! # Update request
		updateOneMaterialRequestItemDescription(input: UpdateMaterialRequestItemDescriptionInput): MaterialRequest! # Update request
		deleteOneMaterialRequest(id: ID!): MaterialRequest! # Delete request
		deleteMultipleMaterialRequests(ids: [ID!]): [MaterialRequest!]! # Delete request
	}

	# --- Subscription ---
	type MaterialRequestChange { # Change event for subscription
		eventType: String
		Changes: MaterialRequest!
	}

	type Subscription {
		onMaterialRequestChange: MaterialRequestChange # Subscription for changes
	}
`;

export { materialRequestTypeDef };
