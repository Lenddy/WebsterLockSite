import { gql } from "@apollo/client";

// get all the Users
export const get_all_users = gql`
	query {
		getAllUsers {
			id
			name
			email
			employeeNum
			department
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
			employeeNum
			department
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
	query getAllMaterialRequests {
		getAllMaterialRequests {
			id
			description

			items {
				id
				itemName
				quantity
				# itemDescription
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

// gets one the Material Requests
export const get_one_material_request = gql`
	query getOneMaterialRequest($id: ID!) {
		getOneMaterialRequest(id: $id) {
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

// gets all the itemGroups  Requests
export const get_all_item_groups = gql`
	query getAllItemGroup {
		getAllItemGroups {
			id
			brand
			itemsList {
				id
				itemName
			}
		}
	}
`;

// gets all the itemGroups  Requests
export const get_one_item_group = gql`
	query getOneItemGroup($id: ID!) {
		getOneItemGroup(id: $id) {
			id
			brand
			itemsList {
				id
				itemName
			}
		}
	}
`;
