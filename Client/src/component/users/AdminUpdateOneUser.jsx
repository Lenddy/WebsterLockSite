import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { admin_update_One_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";

export default function AdminUpdateOneUser({ userId, user }) {
	const [info, setInfo] = useState({});
	const [show, setShow] = useState(false);
	const [adminChangeUserProfile, { data: UpdateData, loading: updateLoading, error: updateError }] = useMutation(admin_update_One_user);

	const navigate = useNavigate();

	// Function to handle input changes and update state accordingly
	/**
	Handles input changes for both text and checkbox fields.
	- For checkboxes, updates the state with the checked value (true/false).
	- For text/select inputs, updates the state with the input value.
	- If the input is cleared (empty string), removes the key from state.
	
	* Extracts the 'name', 'value', 'type', and 'checked' properties from the event target.
	* Handles both text/select and checkbox input types:
	* - For checkboxes: uses 'checked' (boolean) to update state.
	* - For other types: uses 'value' (string) to update state.
	* If the value is an empty string, removes the property from state.
	*
	* @param {React.ChangeEvent<HTMLInputElement>} e - The event object from the input change.
	**/
	const SubmissionInfo = (e) => {
		const { name, value, type, checked } = e.target;
		setInfo((prev) => {
			if (type === "checkbox") {
				// For checkboxes, store boolean checked value
				return { ...prev, [name]: checked };
			}
			if (value === "") {
				// Remove property if input is cleared
				const { [name]: _, ...rest } = prev;
				return rest;
			}
			// For text/select, store string value
			return { ...prev, [name]: value };
		});
	};

	// Function to handle form submission
	/**
	 * Handles the submission of the admin user update form.
	 *
	 * @param {React.FormEvent} e - The form submission event.
	 *
	 * The function prevents the default form submission behavior, then attempts to
	 * call the `adminChangeUserProfile` mutation with the updated user information.
	 * The mutation variables include:
	 * - `id`: The target user's unique identifier.
	 * - `input`: An object containing:
	 *    - `name`: The user's name.
	 *    - `previousEmail`: The user's current email address.
	 *    - `newEmail`: The new email address to update.
	 *    - `password`: The new password.
	 *    - `confirmPassword`: Confirmation of the new password.
	 *    - `newRole`: The new role to assign to the user.
	 *    - `job`: An object with job `title` and `description`.
	 *    - `newPermissions`: An object specifying various user permissions, such as:
	 *        - `canEditUsers`, `canDeleteUsers`, `canChangeRole`, `canViewUsers`, `canViewAllUsers`,
	 *          `canEditSelf`, `canViewSelf`, `canDeleteSelf`.
	 *
	 * On successful mutation, logs the result to the console.
	 * On error, logs the error to the console.
	 */
	const submit = async (e) => {
		e.preventDefault();

		try {
			const res = await adminChangeUserProfile({
				variables: {
					id: userId,
					input: {
						name: info?.name,
						previousEmail: info?.previousEmail,
						newEmail: info?.newEmail,
						password: info?.password,
						confirmPassword: info?.confirmPassword,
						newRole: info?.newRole,
						job: {
							title: info?.title,
							description: info?.description,
						},
						newPermissions: {
							canEditUsers: info?.canEditUsers,
							canDeleteUsers: info?.canDeleteUsers,
							canChangeRole: info?.canChangeRole,
							canViewUsers: info?.canViewUsers,
							canViewAllUsers: info?.canViewAllUsers,
							canEditSelf: info?.canEditSelf,
							canViewSelf: info?.canViewSelf,
							canDeleteSelf: info?.canDeleteSelf,
						},
					},
				},
				onCompleted: (result) => {
					// console.log("admin updateMutation success:", result);
				},
			});

			// console.log("✅ Registered user:", res.data);
			// navigate(`/user/${res.data.adminChangeUserProfile.id}`);
		} catch (err) {
			console.error("❌ Error registering:", err);
		}
	};

	return (
		<div>
			<div>
				<Link to={`/user/${userId}`}> user</Link>
			</div>
			<h1>Admin update</h1>
			<div>
				<form onSubmit={submit}>
					<div>
						<label htmlFor="name">Name:</label>
						<input type="text" name="name" onChange={(e) => SubmissionInfo(e)} placeholder={user.name} />
					</div>

					<div>
						<label htmlFor="previousEmail"> Previous Email:</label>
						<input type="text" name="previousEmail" onChange={(e) => SubmissionInfo(e)} placeholder={user.email} />
					</div>

					<div>
						<label htmlFor="newEmail">new Email:</label>
						<input type="text" name="newEmail" onChange={(e) => SubmissionInfo(e)} />
					</div>

					<div>
						<label htmlFor="password">Password:</label>
						<input type={show === true ? "text" : "password"} name="password" onChange={(e) => SubmissionInfo(e)} />
						<button type="button" onClick={() => setShow(!show)}>
							{show === false ? "show" : "hide"}
						</button>
					</div>

					<div>
						<label htmlFor="confirmPassword">Confirm Password:</label>
						<input type={show === true ? "text" : "password"} name="confirmPassword" onChange={(e) => SubmissionInfo(e)} />
						<button type="button" onClick={() => setShow(!show)}>
							{show === false ? "show" : "hide"}
						</button>
					</div>

					<div>
						{/* <label htmlFor="job">Name:</label> */}

						<label htmlFor="title">job title:</label>
						<input type="text" name="title" onChange={(e) => SubmissionInfo(e)} placeholder={user?.job?.title} />
					</div>

					<div>
						<label htmlFor="description">job description:</label>
						<input type="text" name="description" onChange={(e) => SubmissionInfo(e)} placeholder={user?.job?.description} />
					</div>

					<div>
						<label htmlFor="role">role:</label>
						{/* <input type="text" name="role" onChange={(e) => SubmissionInfo(e)} /> */}

						<select name="newRole" id="" onChange={(e) => SubmissionInfo(e)}>
							<option value="" selected disabled>
								Select Role
							</option>
							<option value="admin">Admin</option>
							<option value="subAdmin">Sub Admin</option>
							<option value="technician">Technician</option>
							<option value="user">user</option>
							<option value="noRole">No Role</option>
						</select>
					</div>

					<div>
						<label htmlFor="permissions">Permissions:</label>
						<ul>
							<li>
								<label htmlFor="canViewAllUsers">can view All users</label>
								<input type="checkbox" name="canViewAllUsers" id="" onChange={(e) => SubmissionInfo(e)} />
							</li>

							<li>
								<label htmlFor="canEditUsers">Can Edit Users </label>
								<input type="checkbox" name="canEditUsers" id="" onChange={(e) => SubmissionInfo(e)} />
							</li>

							<li>
								<label htmlFor="canDeleteUsers">Can Delete Users</label>
								<input type="checkbox" name="canDeleteUsers" id="" onChange={(e) => SubmissionInfo(e)} />
							</li>

							<li>
								<label htmlFor="canChangeRole">Can Change users Role</label>
								<input type="checkbox" name="canChangeRole" id="" onChange={(e) => SubmissionInfo(e)} />
							</li>

							<li>
								<label htmlFor="canEditSelf">Can Edit Self</label>
								<input type="checkbox" name="canEditSelf" id="" onChange={(e) => SubmissionInfo(e)} />
							</li>

							<li>
								<label htmlFor="canViewSelf">Can View Self</label>
								<input type="checkbox" name="canViewSelf" id="" onChange={(e) => SubmissionInfo(e)} />
							</li>

							<li>
								<label htmlFor="canDeleteSelf">Can Delete Self</label>
								<input type="checkbox" name="canDeleteSelf" id="" onChange={(e) => SubmissionInfo(e)} />
							</li>
						</ul>
					</div>

					<div className="validation"> {/* <p color="red"> {validation} </p>{" "} */}</div>
					<button type="submit" disabled={updateLoading}>
						{updateLoading ? " Updating..." : "Update"}
					</button>

					{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
				</form>
			</div>
		</div>
	);
}
