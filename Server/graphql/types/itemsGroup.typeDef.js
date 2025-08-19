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
		id: ID!
		itemName: String
	}

	input ItemInput {
		id: ID!
		itemName: String
	}

	input CreateOneItemGroupInput {
		brand: String
		itemList: [ItemInput]
	}

	input UpdateMaterialRequestInput {
		id: ID!
		brand: String
		itemList: [ItemInput]
	}

	# --- Queries ---
	type Query {
		hello3: String # Test query
		getAllItemGroups: [ItemGroup]! # Get all Item Group
		getOneItemGroup(id: ID!): ItemGroup! # Get one Item Group by ID
	}

	# --- Mutations ---
	type Mutation {
		createOneItemGroup(input: CreateOneItemGroupInput!): ItemGroup! # Create ItemGroup
		updateOneItemGroup(input: UpdateMaterialRequestInput!): ItemGroup! # Update ItemGroup
		deleteOneItemGroup(id: ID!): ItemGroup! # Delete ItemGroup
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
