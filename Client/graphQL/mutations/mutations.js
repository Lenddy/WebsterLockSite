import { gql } from "@apollo/client";

export const register_User = gql`
	mutation registerUser($input: RegisterInput!) {
		registerUser(input: $input) {
			id
			name
			email
			password
			confirmPassword
			role
			job {
				title
				description
			}
			permissions {
				canEditUsers
				canDeleteUsers
				canChangeRole
				canViewUsers
				canViewAllUsers
				canEditSelf
				canViewSelf
				canDeleteSelf
			}
			createdAt
			updatedAt
		}
	}
`;

export const register_multiple_Users = gql`
	mutation registerMultipleUsers($inputs: [RegisterInput!]!) {
		registerMultipleUsers(inputs: $inputs) {
			id
			name
			email
			role
			job {
				title
				description
			}
			permissions {
				canEditUsers
				canDeleteUsers
				canChangeRole
				canViewUsers
				canViewAllUsers
				canEditSelf
				canViewSelf
				canDeleteSelf
			}
			createdAt
			updatedAt
		}
	}
`;

export const log_In_user = gql`
	mutation logInUser($input: LoginInput) {
		loginUser(input: $input) {
			id
			email
			token
		}
	}
`;

export const update_One_user = gql`
	mutation updateUserProfile($id: ID!, $input: UpdateUserProfileInput!) {
		updateUserProfile(id: $id, input: $input) {
			id
			name
			email
			token
			role
			job {
				title
				description
			}
			# permissions {
			# 	canEditUsers
			# 	canDeleteUsers
			# 	canChangeRole
			# 	canViewUsers
			# 	canViewAllUsers
			# 	canEditSelf
			# 	canViewSelf
			# 	canDeleteSelf
			# }
		}
	}
`;

export const admin_update_multiple_users = gql`
	mutation adminChangeMultipleUserProfiles($inputs: [AdminChangeUserProfileInput!]!) {
		adminChangeMultipleUserProfiles(inputs: $inputs) {
			id
			name
			email
			token
			role
			job {
				title
				description
			}
			permissions {
				canEditUsers
				canDeleteUsers
				canChangeRole
				canViewUsers
				canViewAllUsers
				canEditSelf
				canViewSelf
				canDeleteSelf
			}
		}
	}
`;

export const delete_one_user = gql`
	mutation deleteOneUser($id: ID!) {
		deleteOneUser(id: $id) {
			id
		}
	}
`;

export const create_one_material_request = gql`
	mutation createOneMaterialRequest($input: createOneMaterialRequestInput!) {
		createOneMaterialRequest(input: $input) {
			id

			items {
				id
				itemName
				quantity
				itemDescription
			}

			description

			requester {
				userId
				name
				email
			}

			reviewers {
				userId
				email
				name
				comment
				reviewedAt
			}

			approvalStatus {
				approvedBy {
					userId
					name
					email
				}
				isApproved
				approvedAt
			}

			addedDate
		}
	}
`;

export const create_multiple_material_requests = gql`
	mutation createMultipleMaterialRequests($inputs: [createdManyMaterialRequestInput!]!) {
		createMultipleMaterialRequests(inputs: $inputs) {
			id

			items {
				id
				itemName
				quantity
				itemDescription
			}

			description

			requester {
				userId
				name
				email
			}

			reviewers {
				userId
				email
				name
				comment
				reviewedAt
			}

			approvalStatus {
				approvedBy {
					userId
					name
					email
				}
				isApproved
				approvedAt
			}

			addedDate
		}
	}
`;

export const update_One_Material_Request = gql`
	mutation updateOneMaterialRequest($id: ID!, $input: UpdateMaterialRequestInput!) {
		updateOneMaterialRequest(id: $id, input: $input) {
			id
			description

			items {
				id
				itemName
				quantity
				itemDescription
				color
				side
				size
			}

			requester {
				userId
				name
				email
			}

			reviewers {
				userId
				email
				name
				comment
				reviewedAt
			}

			approvalStatus {
				approvedBy {
					userId
					name
					email
				}
				isApproved
				approvedAt
			}

			addedDate
		}
	}
`;

export const create_multiple_itemGroups = gql`
	mutation createMultipleItemGroups($input: [CreateOneItemGroupInput!]!) {
		createMultipleItemGroups(input: $input) {
			id
			brand
			itemsList {
				id
				itemName
			}
		}
	}
`;

export const update_multiple_itemGroups = gql`
	mutation updateMultipleItemGroups($input: [UpdateItemGroupInput!]!) {
		updateMultipleItemGroups(input: $input) {
			id
			brand
			itemsList {
				id
				itemName
			}
		}
	}
`;
