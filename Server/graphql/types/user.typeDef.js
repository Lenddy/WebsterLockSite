// Importing necessary modules
import { gql } from "graphql-tag"; // Used to parse GraphQL schema definitions
import "../scalar/dateTime.js"; // Importing custom scalar for DateTime values

// Defining GraphQL schema using gql template literal
const userTypeDef = gql`
	# Custom scalar to handle date and time values
	scalar DateTime

	# Core user type returned in queries/mutations
	type User {
		id: ID! # Unique user ID
		employeeNum: String
		name: String! # User's name
		email: String! # Email address
		password: String # User's password
		confirmPassword: String # Optional, for internal validation
		token: String! # JWT token for session/auth
		role: UserRole! # Assigned role enum
		department: String
		job: Job # Nested job object
		permissions: Permissions # Nested permissions object
		createdAt: DateTime # Timestamp for when user was created
		updatedAt: DateTime # Timestamp for last update to user profile
	}

	# Enum defining all possible user roles
	enum UserRole {
		headAdmin # Highest level: can manage all users and permissions
		admin # Mid-level: can manage subAdmins, users, and noRoles
		subAdmin # Can manage users and noRoles, but cannot assign roles
		user # Regular user: limited permissions
		technician # users that are only allowed to request material
		noRole # Placeholder for users without a defined role
	}

	# Object type representing a user's job info
	type Job {
		title: String # Job title of the user (e.g., Manager, Engineer)
		description: String # Optional description of user's job or responsibilities
	}

	# Object type representing a user's permission settings
	type Permissions {
		canEditUsers: Boolean # Can this user edit other users?
		canDeleteUsers: Boolean # Can this user delete other users?
		canChangeRole: Boolean # Can this user assign or change roles?
		canViewUsers: Boolean # Can this user view a list of users?
		canViewAllUsers: Boolean # Can this user view all users?
		canEditSelf: Boolean # Can this user update their own profile info?
		canViewSelf: Boolean # Can this user view their own profile?
		canDeleteSelf: Boolean # Can this user delete their own account?
		canRegisterUser: Boolean
		canNotBeDeleted: Boolean
		canNotBeUpdated: Boolean
	}

	# Input object for job data, used in registration or profile update
	input JobInput {
		title: String # Job title to assign
		description: String # Optional job description
	}

	# Input type for Permissions (optional, allows custom permissions on register)
	input PermissionsInput {
		canEditUsers: Boolean
		canDeleteUsers: Boolean
		canChangeRole: Boolean
		canViewUsers: Boolean
		canViewAllUsers: Boolean
		canEditSelf: Boolean
		canViewSelf: Boolean
		canDeleteSelf: Boolean
		canRegisterUser: Boolean
		canNotBeDeleted: Boolean
		canNotBeUpdated: Boolean
	}

	# Input object for registering a user
	input RegisterInput {
		employeeNum: String
		name: String! # Full name of the user
		email: String! # Email address
		password: String # Password for login
		confirmPassword: String # For password match validation
		role: UserRole # Initial role to assign
		department: String
		job: JobInput # Optional job data
		permissions: PermissionsInput # Optional custom permissions for the user
	}

	# Input object for registering a user
	input RegisterManyInput {
		# register
		employeeNum: String
		name: String! # Full name of the user
		email: String! # Email address
		password: String # Password for login
		confirmPassword: String # For password match validation
		role: UserRole # Initial role to assign
		job: JobInput # Optional job data
		department: String
		permissions: PermissionsInput # Optional custom permissions for the user
	}

	# Input object for user login
	input LoginInput {
		email: String! # Email used to log in
		password: String # Corresponding password
	}

	# Input object for updating a user profile
	input UpdateUserProfileInput {
		employeeNum: String
		name: String # New name (optional)
		previousEmail: String # For verification
		newEmail: String # New email to update to
		previousPassword: String # For verification
		newPassword: String # New password to update to
		confirmNewPassword: String # Confirm the new password
		job: JobInput # Optional update to job details
		department: String
	}

	# # Input object for updating a user profile
	# input AdminChangeUserProfileInput {
	# 	name: String # New name (optional)
	# 	previousEmail: String # For verification
	# 	newEmail: String # New email to update to
	# 	previousPassword: String # For verification
	# 	newPassword: String # New password to update to
	# 	confirmNewPassword: String # Confirm the new password
	# 	job: JobInput # Optional update to job details
	# 	newRole: UserRole
	# 	newPermissions: PermissionsInput
	# }

	# Input for updating multiple users
	input AdminChangeUserProfileInput {
		id: ID! # The ID of the user to update
		employeeNum: String
		name: String
		previousEmail: String
		newEmail: String
		previousPassword: String
		newPassword: String
		confirmNewPassword: String
		job: JobInput
		department: String
		newRole: UserRole
		newPermissions: PermissionsInput
	}

	# Root query operations (read-only)
	type Query {
		hello: String # Test query to verify schema
		getAllUsers: [User]! # Fetch list of all users
		getOneUser(id: ID!): User! # Fetch a single user by ID
	}

	# Root mutation operations (write/update)
	type Mutation {
		registerUser(input: RegisterInput): User! # Register a new user
		registerMultipleUsers(inputs: [RegisterInput!]!): [User!]! # Register a new user
		loginUser(input: LoginInput): User! # Authenticate a user and return token
		updateUserProfile(id: ID!, input: UpdateUserProfileInput): User! # Update personal user data
		adminChangeMultipleUserProfiles(inputs: [AdminChangeUserProfileInput!]!): [User!]! # Update others users data
		deleteOneUser(id: ID!): User! # Permanently delete a user
		deleteMultipleUsers(ids: [ID!]): [User!]! # Permanently delete multiple  users
	}

	# Used in subscriptions to indicate type of change and changed user
	type UserChange {
		eventType: String # Type of change (e.g., "created", "updated", "deleted")
		changeType: String! # "single" or "multiple"
		change: User # Updated user object after the change
		changes: [User!]
	}

	# Root subscription operations (real-time updates)
	type Subscription {
		onUserChange: UserChange # Emits whenever a user is created, updated, or deleted
	}
`;

// Exporting the userTypeDef for use in resolvers and schema setup
export { userTypeDef };
