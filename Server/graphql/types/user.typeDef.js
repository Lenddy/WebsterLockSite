// Importing necessary modules
const { gql } = require("apollo-server-express");

// Importing custom scalar DateTime (assuming it's defined in "dateTime.js")
require("../scalar/dateTime");

// Defining GraphQL schema using gql template literal
const userTypeDef = gql`
	scalar DateTime # Custom scalar type for handling DateTime values
	# Object type representing a User
	type User {
		id: ID! # Unique identifier for the user
		name: String! # User's first name
		email: String! # User's email address
		password: String # User's password (should not be returned in queries for security reasons)
		confirmPassword: String # Confirmation of user's password (used for validation)
		token: String # Token for user authentication
		role: String
		createdAt: DateTime # Timestamp indicating when the user was created
		updatedAt: DateTime # Timestamp indicating when the user was last updated
	}

	# Type representing changes in user data for subscriptions
	type Change {
		eventType: String # Type of change (e.g., "created", "updated", "deleted")
		Changes: User! # User object representing the changed data
	}

	# Input type for creating a new user
	input RegisterInput {
		name: String! # User's first name
		email: String! # User's email address
		password: String # User's password
		role: String
		confirmPassword: String # Confirmation of user's password
	}

	input LoginInput {
		email: String! # User's email address
		password: String # User's password
	}

	input UserPersonalInfoInput {
		name: String # User's first name
	}

	input EmailUpdateInput {
		previousEmail: String! # Previous email address
		newEmail: String! # New email address
	}

	input PasswordUpdateInput {
		previousPassword: String! # Previous password
		newPassword: String! # New password
		confirmNewPassword: String! # Confirmation of new password
	}

	# Queries for fetching user data
	type Query {
		hello: String # Just a test query
		getAllUsers: [User]! # Query to fetch all users
		getOneUser(id: ID!): User! # Query to fetch a single user by ID
	}

	# Mutations for creating, updating, and deleting users
	type Mutation {
		registerUser(registerInput: RegisterInput): User! # Mutation to register a new user
		loginUser(loginInput: LoginInput): User! # Mutation to authenticate user login
		updateOneUserName(id: ID!, name: String!): User! # Mutation to update an existing user's personal info
		deleteOneUser(id: ID!): User! # Mutation to delete an existing user
		updateEmail(id: ID!, emailUpdateInput: EmailUpdateInput): User! # Mutation to update a user's email
		updatePassword(id: ID!, passwordUpdateInput: PasswordUpdateInput): User! # Mutation to update the password of a user
	}

	# Subscription type for real-time data updates
	type Subscription {
		onChange: Change # Subscription event triggered on user data change
	}
`;

// Exporting the userTypeDef for use in other modules
module.exports = { userTypeDef };
