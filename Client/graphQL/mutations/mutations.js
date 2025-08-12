import { gql } from "@apollo/client";

export const register_User = gql`
	mutation registerUser($input: RegisterInput!) {
		registerUser(input: $input) {
			id
			name
			email
			password
			confirmPassword
			token
			role
			createdAt
			updatedAt
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

export const log_In_user = gql`
	mutation logInUser($input: LoginInput) {
		loginUser(input: $input) {
			id
			email
			token
		}
	}
`;

export const update_One_client = gql`
	mutation updateOneClient($id: ID!, $clientName: String, $clientLastName: String, $cellPhones: [NumberInput]) {
		updateOneClient(id: $id, clientName: $clientName, clientLastName: $clientLastName, cellPhones: $cellPhones) {
			id
			clientName
			clientLastName
			cellPhones {
				numberId
				number
			}
			# createdAt
			# updateAt
		}
	}
`;

// {
// 	id
// 	number
// }
export const delete_one_client = gql`
	mutation deleteOneClient($id: ID!) {
		deleteOneClient(id: $id) {
			id
		}
	}
`;
