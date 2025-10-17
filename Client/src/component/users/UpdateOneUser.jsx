import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { update_One_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { Link } from "react-router-dom";

export default function UpdateOneUser({ userId, user }) {
	const [info, setInfo] = useState({});
	const [show, setShow] = useState(false);
	// const [job, setJob] = useState({});
	const [updateUserProfile, { data: UpdateData, loading: updateLoading, error: updateError }] = useMutation(update_One_user);

	// Function to handle input changes and update state accordingly
	const SubmissionInfo = (e) => {
		/**
		 * Extracts the 'name' and 'value' properties from the event target.
		 * Typically used in form input change handlers to identify which input field
		 * triggered the event and retrieve its current value.
		 *
		 * @param {React.ChangeEvent<HTMLInputElement>} e - The event object from the input change.
		 * @returns {string} name - The name attribute of the input element.
		 * @returns {string} value - The current value of the input element.
		 */
		const { name, value } = e.target;
		setInfo((prev) => {
			if (value === "") {
				const { [name]: _, ...rest } = prev;
				return rest;
			}
			return { ...prev, [name]: value };
		});
	};

	console.log("this is the info ", info);

	// console.log("Info", info);
	// console.log("permissionsInfo", permission);
	// console.log("jobInfo", job);

	// Function to handle form submission
	const submit = async (e) => {
		e.preventDefault();

		try {
			await updateUserProfile({
				variables: {
					id: userId,
					input: {
						name: info?.name,
						previousEmail: info?.previousEmail,
						newEmail: info?.newEmail,
						password: info?.password,
						confirmPassword: info?.confirmPassword,
						job: {
							title: info?.title,
							description: info?.description,
						},
					},
				},
				onCompleted: (data) => {
					// Handle successful update, e.g. show a message or redirect
					// console.log(" User updated:", data);
					alert("User updated successfully!");
				},
			});
		} catch (err) {
			console.error(" Error updating user:", err);
		}
	};

	return (
		<div>
			<div>
				<Link to={`/user/${userId}`}> user</Link>
			</div>
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
