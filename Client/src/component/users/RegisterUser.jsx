import { register_User } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterUser() {
	const [info, setInfo] = useState({});
	const [permission, setPermission] = useState({});
	const [job, setJob] = useState({});
	const navigate = useNavigate();
	const [registerUser, { data, loading, error }] = useMutation(register_User);
	const [show, setShow] = useState(false);

	// Function to handle input changes and update state accordingly
	const SubmissionInfo = (e) => {
		setInfo({
			...info,
			[e.target.name]: e.target.value,
			// permissions: permission,
		});
	};

	// Function to handle input changes and update state accordingly
	const permissionsInfo = (e) => {
		setPermission({
			...permission,
			[e.target.name]: e.target.value === "on" ? true : false,
		});
	};

	// Function to handle input changes and update state accordingly
	const jobInfo = (e) => {
		setJob({
			...job,
			[e.target.name]: e.target.value,
		});
	};

	console.log("Info", info);
	console.log("permissionsInfo", permission);
	console.log("jobInfo", job);

	// Function to handle form submission
	const submit = async (e) => {
		e.preventDefault();

		await registerUser({
			variables: {
				input: {
					name: info.name,
					email: info.email,
					password: info.password,
					confirmPassword: info.confirmPassword,
					role: info.role,
					job: {
						title: job.title,
						description: job.description,
					},
					permissions: {
						canEditUsers: permission.canEditUsers || false,
						canDeleteUsers: permission.canDeleteUsers || false,
						canChangeRole: permission.canChangeRole || false,
						canViewUsers: permission.canViewUsers || false,
						canViewAllUsers: permission.canViewAllUsers || false,
						canEditSelf: permission.canEditSelf || true,
						canViewSelf: permission.canViewSelf || true,
						canDeleteSelf: permission.canDeleteSelf || false,
					},
				},
			},
		})
			.then((res) => {
				console.log("✅ Registered user:", res.data.registerUser);
				navigate(`/user/${res.data.registerUser.id}`);
			})
			.catch((err) => {
				console.error("❌ Error registering:", err);
			});
	};

	return (
		<>
			{/* {logUser?.name} */}
			<h1>Register </h1>

			<div>
				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
					Log out
				</Link>
			</div>

			<div>
				<Link to={"/user/all"}>all users</Link>
			</div>

			<div>
				<form onSubmit={submit}>
					<div>
						<label htmlFor="name">Name:</label>
						<input type="text" name="name" onChange={(e) => SubmissionInfo(e)} />
					</div>

					<div>
						<label htmlFor="email">Email:</label>
						<input type="text" name="email" onChange={(e) => SubmissionInfo(e)} />
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
						<input type="text" name="title" onChange={(e) => jobInfo(e)} />
					</div>

					<div>
						<label htmlFor="description">job description:</label>
						<input type="text" name="description" onChange={(e) => jobInfo(e)} />
					</div>

					<div>
						<label htmlFor="role">role:</label>
						{/* <input type="text" name="role" onChange={(e) => SubmissionInfo(e)} /> */}

						<select name="role" id="" onChange={(e) => SubmissionInfo(e)}>
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
						</ul>
					</div>

					<div className="validation"> {/* <p color="red"> {validation} </p>{" "} */}</div>
					<button type="submit" disabled={loading}>
						{loading ? "Registering  ..." : "Register"}
					</button>

					{error && <p style={{ color: "red" }}>{error.message}</p>}
				</form>
			</div>
		</>
	);
}
