// Import the gql tag for defining GraphQL schema
import { gql } from "graphql-tag";
// Import custom DateTime scalar definition
import "../scalar/dateTime.js";

// Define the GraphQL type definitions for MaterialRequest and related types
const itemGroupTypeDef = gql`
	scalar DateTime # Custom scalar for date-time values
	# --- Item and related types ---
	type ItemGroup { # Main item type
		id: ID!
		brand: String!
		itemsList: [Item]
	}

	type Item {
		id: ID
		itemName: String
	}

	input ItemInput {
		itemName: String
	}

	input ItemUpdateInput {
		id: ID
		itemName: String
		action: Action!
	}

	input CreateOneItemGroupInput {
		brand: String!
		itemsList: [ItemInput]
	}

	input UpdateItemGroupInput {
		id: ID!
		brand: String
		itemsList: [ItemUpdateInput]
		brandNameUpdate: Boolean
	}

	# --- Action input ---
	input Action { # Action to perform on item
		toBeAdded: Boolean
		toBeUpdated: Boolean
		toBeDeleted: Boolean
	}

	# type DeleteResponse {
	# 	success: Boolean!
	# 	deletedCount: Int!
	# 	deletedIds: [ID!]!
	# }

	# --- Queries ---
	type Query {
		hello3: String # Test query
		getAllItemGroups: [ItemGroup]! # Get all Item Group
		getOneItemGroup(id: ID!): ItemGroup! # Get one Item Group by ID
	}

	# --- Mutations ---
	type Mutation {
		createOneItemGroup(input: CreateOneItemGroupInput!): ItemGroup! # Create ItemGroup
		createMultipleItemGroups(input: [CreateOneItemGroupInput!]!): [ItemGroup!]!
		updateMultipleItemGroups(input: [UpdateItemGroupInput!]!): [ItemGroup!]! # Update ItemGroups
		deleteMultipleItemGroups(ids: [ID!]): [ItemGroup!] # Delete ItemGroup
	}

	# --- Subscription ---
	type ItemGroupChange { # Change event for subscription
		eventType: String
		Changes: ItemGroup!
	}

	type Subscription {
		onItemGroupChange: ItemGroupChange # Subscription for changes
	}
`;

export { itemGroupTypeDef };
