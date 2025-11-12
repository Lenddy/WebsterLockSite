import { gql } from "@apollo/client";

export const USER_CHANGE_SUBSCRIPTION = gql`
	subscription OnUserChange {
		onUserChange {
			changeType
			eventType
			updateBy
			change {
				id
				employeeNum
				name
				email
				token
				role
				department
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
					canRegisterUser
					canNotBeDeleted
					canNotBeUpdated
				}
			}

			changes {
				id
				name
				email
				token
				role
				employeeNum
				department
				# createdAt
				# updatedAt
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
					canRegisterUser
					canNotBeDeleted
					canNotBeUpdated
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
			changeType
			change {
				id
				brand
				itemsList {
					id
					itemName
				}
			}

			changes {
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
