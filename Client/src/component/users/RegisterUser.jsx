import { register_User } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Eye from "../../assets/eye.svg?react";
import CloseEye from "../../assets/closeEye.svg?react";

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
				// console.log(" Registered user:", res.data.registerUser);
				alert("User registered successfully!");
				navigate(`/user/${res.data.registerUser.id}`);
			})
			.catch((err) => {
				console.error(" Error registering:", err);
			});
	};

	return (
		<div className="register-container">
			<form className="register-form" onSubmit={submit}>
				<div className="register-form-title">
					<h1>Register </h1>
				</div>

				<div className="register-form-wrapper">
					<div className="register-form-row">
						<div className="form-row-top-container">
							<div className="form-row-top-left">
								<label htmlFor="employeeNun">Employee Number:</label>
								<input type="text" name="employeeNum" onChange={(e) => SubmissionInfo(e)} placeholder="Employee Number" />
							</div>

							<div className="form-row-top-right">
								<label htmlFor="department">Department:</label>
								<input type="text" name="department" onChange={(e) => SubmissionInfo(e)} placeholder="Department" />
							</div>

							<div className="form-row-top-left">
								<label htmlFor="name">Name:</label>
								<input type="text" name="name" onChange={(e) => SubmissionInfo(e)} placeholder="Name" />
							</div>

							<div className="form-row-top-right">
								<label htmlFor="email">Email:</label>
								<input type="text" name="email" onChange={(e) => SubmissionInfo(e)} placeholder="Email" />
							</div>
						</div>

						<div className="form-row-center-container">
							<div className="form-row-center-left">
								<div className="form-row-center-left-wrapper">
									<div>
										<label htmlFor="password">Password:</label>
										<div className="update-form-input">
											<input type={show === true ? "text" : "password"} name="password" onChange={(e) => SubmissionInfo(e)} placeholder="Password" />
											<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
												{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>

									<div>
										<label htmlFor="confirmPassword">Confirm Password:</label>
										<div className="update-form-input">
											<input type={show === true ? "text" : "password"} name="confirmPassword" onChange={(e) => SubmissionInfo(e)} placeholder="Confirm Password" />

											<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
												{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="form-row-center-right">
								<div className="form-row-center-right-wrapper">
									<div>
										{/* <label htmlFor="job">Name:</label> */}

										<label htmlFor="title">job title:</label>
										<input type="text" name="title" onChange={(e) => jobInfo(e)} placeholder="Job Title" />
									</div>

									<div>
										<label htmlFor="description">job description:</label>
										<textarea type="text" name="description" onChange={(e) => jobInfo(e)} placeholder="Job Description" />
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
								</div>
							</div>
						</div>

						<div className="form-row-center-bottom">
							<div>
								<label htmlFor="permissions">Permissions:</label>

								<div className="permissions-grid">
									<div>
										<ul className="permissions-list">
											<li>
												<label htmlFor="canViewAllUsers">Can View All Users</label>
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
												<label htmlFor="canChangeRole">Can Change Role</label>
												<input type="checkbox" name="canChangeRole" id="" onChange={(e) => permissionsInfo(e)} />
											</li>
										</ul>
									</div>

									<div>
										<ul className="permissions-list">
											<li>
												<label htmlFor="canEditSelf">Can Edit Self</label>
												<input type="checkbox" name="canEditSelf" id="" onChange={(e) => permissionsInfo(e)} />
											</li>

											<li>
												<label htmlFor="canViewSelf">Can View Self</label>
												<input type="checkbox" name="canViewSelf" id="" onChange={(e) => permissionsInfo(e)} />
											</li>

											<li>
												<label htmlFor="canEditSelf">Can Delete Self</label>
												<input type="checkbox" name="canEditSelf" id="" onChange={(e) => permissionsInfo(e)} />
											</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="validation"> {/* <p color="red"> {validation} </p>{" "} */}</div>

				<div className="form-action-btn">
					<button className="form-submit-btn" type="submit" disabled={loading}>
						{loading ? "Registering  ..." : "Register User"}
					</button>
				</div>

				{error && <p style={{ color: "red" }}>{error.message}</p>}
			</form>
		</div>
	);
}
