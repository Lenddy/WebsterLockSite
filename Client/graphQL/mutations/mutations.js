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

export const admin_update_One_user = gql`
	mutation adminChangeUserProfile($id: ID!, $input: AdminChangeUserProfileInput!) {
		adminChangeUserProfile(id: $id, input: $input) {
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

export const Create_One_Material_Request = gql`
	mutation createOneMaterialRequest($id: ID!, $input: CreateOneMaterialRequestInput!) {
		createOneMaterialRequest(id: $id, input: $input) {
			id
			description

			items {
				id
				itemName
				quantity
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
export const update_One_Material_Request = gql`
	mutation updateOneMaterialRequest($id: ID!, $input: UpdateMaterialRequestInput!) {
		updateOneMaterialRequest(id: $id, input: $input) {
			id
			description

			items {
				id
				itemName
				quantity
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
