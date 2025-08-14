import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { admin_update_One_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";

export default function AdminUpdateOneUser({ userId, user }) {
	const [info, setInfo] = useState({});
	const [show, setShow] = useState(false);
	const [permission, setPermission] = useState({});
	const [job, setJob] = useState({});
	const [adminChangeUserProfile, { data: UpdateData, loading: updateLoading, error: updateError }] = useMutation(admin_update_One_user);

	const navigate = useNavigate();

	// Function to handle input changes and update state accordingly
	const SubmissionInfo = (e) => {
		setInfo({
			...info,
			[e.target.name]: e.target.value,
			// permissions: permission,
		});
	};

	// Function to handle input changes and update state accordingly
	// const permissionsInfo = (e) => {
	// 	setPermission({
	// 		...permission,
	// 		[e.target.name]: e.target.value === "on" ? true : false,
	// 	});
	// };

	// Function to handle input changes and update state accordingly
	const jobInfo = (e) => {
		setJob({
			...job,
			[e.target.name]: e.target.value,
		});
	};

	// console.log("Info", info);
	// console.log("permissionsInfo", permission);
	// console.log("jobInfo", job);

	// Function to handle form submission
	const submit = async (e) => {
		e.preventDefault();

		await adminChangeUserProfile({
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
						title: job?.title,
						description: job?.description,
					},
					// newPermissions: {
					// 	canEditUsers: permission?.canEditUsers,
					// 	canDeleteUsers: permission?.canDeleteUsers,
					// 	canChangeRole: permission?.canChangeRole,
					// 	canViewUsers: permission?.canViewUsers,
					// 	canViewAllUsers: permission?.canViewAllUsers,
					// 	canEditSelf: permission?.canEditSelf,
					// 	canViewSelf: permission?.canViewSelf,
					// 	canDeleteSelf: permission?.canDeleteSelf,
					// },
				},
			},
		})
			.then((res) => {
				console.log("✅ Registered user:", res.data);
				// navigate(`/user/${res.data.adminChangeUserProfile.id}`);
			})
			.catch((err) => {
				console.error("❌ Error registering:", err);
			});
	};

	return (
		<div>
			<div>
				<Link to={`/user/${userId}`}> user</Link>
			</div>
			<h1>i am the admin update</h1>
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
						<input type="text" name="title" onChange={(e) => jobInfo(e)} placeholder={user?.job?.title} />
					</div>

					<div>
						<label htmlFor="description">job description:</label>
						<input type="text" name="description" onChange={(e) => jobInfo(e)} placeholder={user?.job?.description} />
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

					{/* <div>
						<label htmlFor="permissions">Permissions:</label>
						<ul>
							<li>
								<label htmlFor="canViewAllUsers">can view All users</label>
								<input type="checkbox" name="canViewAllUsers" id="" onChange={(e) => permissionsInfo(e)} />
							</li>

							<li>
								<label htmlFor="canEditUsers">Can Edit Users </label>
								<input type="checkbox" name="canEditUsers" id="" onChange={(e) => permissionsInfo(e)} />
							</li>

							<li>
								<label htmlFor="canDeleteUsers">Can Delete Users</label>
								<input type="checkbox" name="canDeleteUsers" id="" onChange={(e) => permissionsInfo(e)} />
							</li>

							<li>
								<label htmlFor="canChangeRole">Can Change users Role</label>
								<input type="checkbox" name="canChangeRole" id="" onChange={(e) => permissionsInfo(e)} />
							</li>

							<li>
								<label htmlFor="canEditSelf">Can Edit Self</label>
								<input type="checkbox" name="canEditSelf" id="" onChange={(e) => permissionsInfo(e)} />
							</li>

							<li>
								<label htmlFor="canViewSelf">Can View Self</label>
								<input type="checkbox" name="canViewSelf" id="" onChange={(e) => permissionsInfo(e)} />
							</li>

							<li>
								<label htmlFor="canDeleteSelf">Can Delete Self</label>
								<input type="checkbox" name="canDeleteSelf" id="" onChange={(e) => permissionsInfo(e)} />
							</li>
						</ul>
					</div> */}

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
