import { gql } from "@apollo/client";

export const USER_CHANGE_SUBSCRIPTION = gql`
	subscription OnUserChange {
		onUserChange {
			eventType
			Changes {
				id
				name
				email
				employeeNum
				department
				role
				job {
					title
					description
				}
			}
		}
	}
`;

export const MATERIAL_REQUEST_CHANGE_SUBSCRIPTION = gql`
	subscription OnMaterialRequestChange {
		onMaterialRequestChange {
			eventType
			changeType
			change {
				id
				requester {
					userId
					email
					name
					employeeNum
					department
					role
					permissions {
						canEditUsers
						canDeleteUsers
						canChangeRole
						canViewUsers
						canViewAllUsers
						canEditSelf
						canViewSelf
						canDeleteSelf
						canRegisterUser
					}
				}
				reviewers {
					userId
					email
					name
					employeeNum
					department
					role
					permissions {
						canEditUsers
						canDeleteUsers
						canChangeRole
						canViewUsers
						canViewAllUsers
						canEditSelf
						canViewSelf
						canDeleteSelf
						canRegisterUser
					}
					comment
					reviewedAt
				}
				approvalStatus {
					approvedBy {
						userId
						email
						name
						employeeNum
						department
					}
					approvedAt
					isApproved
				}
				description
				addedDate
				items {
					id
					itemName
					quantity
					itemDescription
					color
					side
					size
				}
			}

			changes {
				id
				requester {
					userId
					email
					name
					role
					employeeNum
					department
				}
				reviewers {
					userId
					email
					name
					role
					employeeNum
					department
				}
				approvalStatus {
					approvedBy {
						userId
						email
						name
					}
					approvedAt
					isApproved
				}
				description
				addedDate
				items {
					id
					itemName
					quantity
					itemDescription
					color
					side
					size
				}
				# createdAt
				# updatedAt
			}
		}
	}
`;

export const ITEM_GROUP_CHANGE_SUBSCRIPTION = gql`
	subscription OnItemGroupChange {
		onItemGroupChange {
			eventType
			Changes {
				id
				brand
				itemsList {
					id
					itemName
				}
			}
		}
	}
`;
