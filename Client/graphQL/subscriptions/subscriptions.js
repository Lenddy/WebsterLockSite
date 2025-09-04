import { gql } from "@apollo/client";

export const USER_CHANGE_SUBSCRIPTION = gql`
	subscription OnUserChange {
		onUserChange {
			eventType
			Changes {
				id
				name
				email
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
			Changes {
				id
				description
				addedDate
				requester {
					userId
					name
					email
					role
				}
				reviewers {
					userId
					name
					email
					role
					comment
					reviewedAt
				}
				approvalStatus {
					isApproved
					approvedAt
					approvedBy {
						userId
						name
						email
					}
				}
				items {
					id
					itemName
					quantity
					itemDescription
					color
					side
					size
				}
				createdAt
				updatedAt
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
