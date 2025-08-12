import { gql } from "@apollo/client";

// get all the Users
export const get_all_users = gql`
	query {
		getAllUsers {
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
			createdAt
			updatedAt
		}
	}
`;

// query to get one User
export const get_one_user = gql`
	query getOneUser($id: ID!) {
		getOneUser(id: $id) {
			id
			name
			email
			role
			token
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
				canNotBeDeleted
				canNotBeUpdated
			}
		}
	}
`;

// gets all the Material Requests
export const get_all_material_requests = gql`
	query {
		getAllMaterialRequests {
			id
			description

			addedDate
			items {
				id
				itemName
				quantity
			}
			requesterId {
				id
				name
				role
			}
			reviewerId {
				id
				name
				role
			}
			approvalStatus {
				approved
				denied
				reviewedAt
				comment
			}
		}
	}
`;

// gets one the Material Requests
export const get_one_material_requests = gql`
	query {
		getOneMaterialRequest {
			id
			requesterId {
				id
				name
				job {
					title
					description
				}
			}
			reviewerId {
				id
				name
				job {
					title
				}
			}
			description
			addedDate
			items {
				itemName
				quantity
				id
			}
			approvalStatus {
				approved
				denied
				reviewedAt
				comment
			}
		}
	}
`;
