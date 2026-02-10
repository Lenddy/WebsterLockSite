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
				permissions
			}

			changes {
				id
				name
				email
				token
				role
				employeeNum
				department
				permissions
			}
		}
	}
`;

// TODO - you need to change the model for the material request because the users where change

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
					permissions
				}
				reviewers {
					userId
					email
					name
					employeeNum
					department
					role
					permissions
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
