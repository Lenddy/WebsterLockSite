import { useState } from "react";
import { useMutation } from "@apollo/client";
import { update_One_user } from "../../../graphQL/mutations/mutations";
import Eye from "../../assets/eye.svg?react";
import CloseEye from "../../assets/closeEye.svg?react";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";

export default function UpdateOneUser({ userId }) {
	// user
	const { userToken, loading: authLoading } = useAuth();

	const user = jwtDecode(userToken);
	const [show, setShow] = useState(false);
	const [info, setInfo] = useState({
		name: user?.name || "",
		previousEmail: user?.email || "",
		newEmail: "",
		previousPassword: "",
		newPassword: "",
		confirmNewPassword: "",
		employeeNum: user?.employeeNum || "",
		department: user?.department || "",
		newRole: user?.role || "",
		title: user?.job?.title || "",
		description: user?.job?.description || "",
		newPermissions: {
			canViewAllUsers: user?.permissions?.canViewAllUsers || false,
			canEditUsers: user?.permissions?.canEditUsers || false,
			canDeleteUsers: user?.permissions?.canDeleteUsers || false,
			canChangeRole: user?.permissions?.canChangeRole || false,
			canEditSelf: user?.permissions?.canEditSelf ?? true,
			canViewSelf: user?.permissions?.canViewSelf ?? true,
			canDeleteSelf: user?.permissions?.canDeleteSelf || false,
		},
	});

	const [updateUserProfile, { loading: updateLoading, error: updateError }] = useMutation(update_One_user);

	// Handle input and checkbox changes
	const SubmissionInfo = (e) => {
		const { name, value, type, checked } = e.target;
		setInfo((prev) => {
			if (type === "checkbox") {
				return {
					...prev,
					newPermissions: {
						...prev.newPermissions,
						[name]: checked,
					},
				};
			}
			return { ...prev, [name]: value };
		});
	};

	const formatKey = (key) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (str) => str.toUpperCase());

	const submit = async (e) => {
		e.preventDefault();
		try {
			await updateUserProfile({
				variables: {
					id: userId,
					input: {
						name: info.name || undefined,
						previousEmail: info.previousEmail || undefined,
						newEmail: info.newEmail || undefined,
						previousPassword: info.previousPassword || undefined,
						newPassword: info.newPassword || undefined,
						confirmNewPassword: info.confirmNewPassword || undefined,
						employeeNum: info.employeeNum || undefined,
						department: info.department || undefined,
						role: info.newRole || undefined,
						job: {
							title: info.title || undefined,
							description: info.description || undefined,
						},
						permissions: info.newPermissions,
					},
				},
				onCompleted: () => {
					alert(" User updated successfully!");
				},
			});
		} catch (err) {
			console.error("Error updating user:", err);
		}
	};

	return (
		<div className="update-container">
			<form className="update-form" onSubmit={submit}>
				<h1 className="update-form-title">Update Profile</h1>

				<div className="update-form-wrapper">
					<div className="update-form-row">
						{/* Top Section */}
						<div className="form-row-top-container">
							<div className="form-row-top-left">
								<label htmlFor="name">Previous Name</label>
								<input type="text" placeholder={user?.name} disabled />
							</div>

							<div className="form-row-top-right">
								<label htmlFor="previousEmail">Previous Email</label>
								<input type="text" name="previousEmail" placeholder={user?.email} disabled />
							</div>

							<div className="form-row-top-left">
								<label htmlFor="employeeNum">Employee Number</label>
								<input type="text" name="employeeNum" value={info.employeeNum} onChange={SubmissionInfo} />
							</div>

							<div className="form-row-top-right">
								<label htmlFor="department">Department</label>
								<input type="text" name="department" value={info.department} onChange={SubmissionInfo} />
							</div>
						</div>

						{/* Center Section */}
						<div className="form-row-center-container">
							<div className="form-row-center-left">
								<div className="form-row-center-left-wrapper">
									<div>
										<label htmlFor="name">New Name:</label>
										<input type="text" name="name" value={info.name} onChange={SubmissionInfo} />
									</div>

									<div>
										<label htmlFor="newEmail">New Email:</label>
										<input type="text" name="newEmail" value={info.newEmail} onChange={SubmissionInfo} />
									</div>

									<div>
										<label>Previous Password:</label>
										<div className="update-form-input">
											<input type={show ? "text" : "password"} name="previousPassword" value={info.previousPassword} onChange={SubmissionInfo} placeholder="Previous password" />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>

									<div>
										<label>New Password:</label>
										<div className="update-form-input">
											<input type={show ? "text" : "password"} name="newPassword" value={info.newPassword} onChange={SubmissionInfo} />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>

									<div>
										<label>Confirm Password:</label>
										<div className="update-form-input">
											<input type={show ? "text" : "password"} name="confirmNewPassword" value={info.confirmNewPassword} onChange={SubmissionInfo} />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="form-row-center-right">
								<div className="form-row-center-right-wrapper">
									<div>
										<label htmlFor="title">Job Title:</label>
										<input type="text" name="title" value={info.title} onChange={SubmissionInfo} placeholder={user?.job?.title} />
									</div>

									<div>
										<label>New Job Description:</label>
										<textarea name="description" value={info.description} onChange={SubmissionInfo} placeholder="New Job Description"></textarea>
									</div>

									<div>
										<label>New Role:</label>
										<select name="newRole" value={info.newRole} onChange={SubmissionInfo}>
											<option value="" disabled>
												Select Role
											</option>
											<option value="admin">Admin</option>
											<option value="subAdmin">Sub Admin</option>
											<option value="technician">Technician</option>
											<option value="user">User</option>
											<option value="noRole">No Role</option>
										</select>
									</div>
								</div>
							</div>
						</div>

						{/* Permissions Section */}
						<div className="form-row-center-bottom">
							<div className="permissions-grid">
								<div>
									<label>User Permissions</label>
									<ul className="permissions-list">
										{Object.keys(info.newPermissions)
											.filter((key) => key.includes("Users") || key.includes("Role"))
											.map((key) => (
												<li key={key}>
													<label>
														{formatKey(key)}
														<input type="checkbox" name={key} checked={info.newPermissions[key]} onChange={SubmissionInfo} />
													</label>
												</li>
											))}
									</ul>
								</div>

								<div>
									<label>Self Permissions</label>
									<ul className="permissions-list">
										{Object.keys(info.newPermissions)
											.filter((key) => key.includes("Self"))
											.map((key) => (
												<li key={key}>
													<label>
														{formatKey(key)}
														<input type="checkbox" name={key} checked={info.newPermissions[key]} onChange={SubmissionInfo} />
													</label>
												</li>
											))}
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="validation"></div>

				{/* <button type="submit" disabled={updateLoading}>
					{updateLoading ? "Updating..." : "Update"}
				</button> */}

				<div className="form-action-btn">
					<button className="form-submit-btn" type="submit" disabled={updateLoading}>
						{/* || isFormInvalid */}
						{updateLoading ? "Updating..." : "Update Users"}
					</button>
				</div>

				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
			</form>
		</div>
	);
}

// import React, { useEffect, useState } from "react";
// import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
// import { update_One_user } from "../../../graphQL/mutations/mutations";
// import { useMutation } from "@apollo/client";
// import Eye from "../../assets/eye.svg?react"; //
// import CloseEye from "../../assets/closeEye.svg?react";

// export default function UpdateOneUser({ userId, user }) {
// 	const [info, setInfo] = useState({
// 		// id: "",
// 		// name: "",
// 		// previousEmail: "",
// 		// newEmail: "",
// 		// previousPassword: "",
// 		// newPassword: "",
// 		// confirmNewPassword: "",
// 		// title: "",
// 		// description: "",
// 		// newRole: "",
// 		// employeeNum: "",
// 		// department: "",
// 		// newPermissions: {
// 		// 	canViewAllUsers: false,
// 		// 	canEditUsers: false,
// 		// 	canDeleteUsers: false,
// 		// 	canChangeRole: false,
// 		// 	canEditSelf: true,
// 		// 	canViewSelf: true,
// 		// 	canDeleteSelf: false,
// 		// },
// 		// locked: false, //ensure new rows are never locked
// 	});
// 	const [show, setShow] = useState(false);
// 	// const [job, setJob] = useState({});
// 	const [updateUserProfile, { data: UpdateData, loading: updateLoading, error: updateError }] = useMutation(update_One_user);

// 	// !!! validation
// 	// // Validation
// 	// const hasEmptyRequiredFields = rows.some((row) => {
// 	// 	// 1. ID always required
// 	// 	if (!row?.id) return true;

// 	// 	// 2. Email change rule
// 	// 	if (row?.newEmail && !row.previousEmail) return true;

// 	// 	// 3. Password change rules
// 	// 	if (row?.newPassword) {
// 	// 		if (!row?.confirmNewPassword) return true;

// 	// 		// Only require previousPassword if not headAdmin
// 	// 		if (logUser.role !== "headAdmin" && !row?.previousPassword) return true;
// 	// 	}

// 	// 	// 4. If ID is selected but *no other field is changed*
// 	// 	const noChangesMade = !row.newEmail && !row.newPassword && !row?.confirmNewPassword && !row?.role && !row?.newPermissions && !row?.name && !row?.title && !row?.description && !row?.department && !row?.employeeNum;

// 	// 	if (row?.id && noChangesMade) {
// 	// 		console.warn(" Row has an ID but no other fields were changed.");
// 	// 		return true;
// 	// 	}
// 	// 	// setSuccess({ success: false });
// 	// 	// setSuccess(null);

// 	// 	return false; // valid row
// 	// });

// 	// !!! validation
// 	// const isFormInvalid = hasEmptyRequiredFields || hasDuplicateEmails;

// 	// const formatKey = (key) => {
// 	// 	return key
// 	// 		.replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters
// 	// 		.replace(/^./, (str) => str.toUpperCase()); // capitalize first letter
// 	// };

// 	// console.log("this is the info ", info);

// 	// Function to handle input changes and update state accordingly
// 	const SubmissionInfo = (e) => {
// 		/**
// 		 * Extracts the 'name' and 'value' properties from the event target.
// 		 * Typically used in form input change handlers to identify which input field
// 		 * triggered the event and retrieve its current value.
// 		 *
// 		 * @param {React.ChangeEvent<HTMLInputElement>} e - The event object from the input change.
// 		 * @returns {string} name - The name attribute of the input element.
// 		 * @returns {string} value - The current value of the input element.
// 		 *
// 		 */
// 		console.log("this is the target", e);
// 		const { name, value, type, checked } = e.target;
// 		// console.log("this is the target", e.target);
// 		console.log("this is the target", value);
// 		setInfo((prev) => {
// 			const changes = prev;
// 			if (type === "checkbox") {
// 				changes.newPermissions[name] = checked;
// 			} else {
// 				changes[name] = value;
// 			}
// 			return changes;
// 		});
// 	};

// 	// Function to handle form submission
// 	const submit = async (e) => {
// 		e.preventDefault();

// 		try {
// 			await updateUserProfile({
// 				variables: {
// 					id: userId,
// 					input: {
// 						name: info?.name,
// 						previousEmail: info?.previousEmail,
// 						newEmail: info?.newEmail,
// 						password: info?.password,
// 						confirmPassword: info?.confirmPassword,
// 						job: {
// 							title: info?.title,
// 							description: info?.description,
// 						},
// 					},
// 				},
// 				onCompleted: (data) => {
// 					// Handle successful update, e.g. show a message or redirect
// 					// console.log(" User updated:", data);
// 					alert("User updated successfully!");
// 				},
// 			});
// 		} catch (err) {
// 			console.error(" Error updating user:", err);
// 		}
// 	};

// 	console.log();
// 	return (
// 		// <div>
// 		<div className="update-container">
// 			<form className="update-form" onSubmit={submit}>
// 				<h1 className="update-form-title">Update Profile</h1>

// 				<div className="update-form-wrapper">
// 					<div className="update-form-row">
// 						<div className="form-row-top-container">
// 							<div className="form-row-top-left">
// 								{/* <div> */}
// 								<label htmlFor="name">Previous Name</label>
// 								<input
// 									type="text"
// 									onChange={(e) => SubmissionInfo(e)}
// 									placeholder={user?.name}
// 									// value={user?.name}
// 									disabled
// 								/>
// 								{/* </div> */}
// 							</div>

// 							<div className="form-row-top-right">
// 								{/* <div> */}
// 								<label htmlFor="previousEmail">Previous Email</label>
// 								<input
// 									type="text"
// 									name="previousEmail"
// 									onChange={(e) => SubmissionInfo(e)}
// 									placeholder={user?.email}
// 									//  value={user?.email}
// 									disabled
// 								/>
// 								{/* </div> */}
// 							</div>

// 							<div className="form-row-top-left">
// 								<label htmlFor="employeeNun">Employee Number</label>
// 								<input type="text" name="employeeNum" onChange={(e) => SubmissionInfo(e)} placeholder={user?.employeeNum} />
// 							</div>

// 							<div className="form-row-top-right">
// 								<label htmlFor="department">Department</label>
// 								<input type="text" name="department" onChange={(e) => SubmissionInfo(e)} placeholder={user?.department} />
// 							</div>
// 						</div>
// 						{/*!!!!!!!!!  center   !!!!!!!!*/}

// 						<div className="form-row-center-container">
// 							<div className="form-row-center-left">
// 								<div className="form-row-center-left-wrapper">
// 									<div>
// 										<label htmlFor="newName">New Name:</label>
// 										<input type="text" name="newEmail" onChange={(e) => SubmissionInfo(e)} />
// 									</div>

// 									<div>
// 										<label htmlFor="newEmail">New Email:</label>
// 										<input type="text" name="newEmail" onChange={(e) => SubmissionInfo(e)} />
// 									</div>

// 									{/* {logUser.role !== "headAdmin" ? ( */}
// 									<div>
// 										<label>Previous Password:</label>
// 										<div className="update-form-input">
// 											<input
// 												type={show ? "text" : "password"}
// 												name="previousPassword"
// 												// value={row?.previousPassword} onChange={(e) => handleRowChange(index, e)}
// 												placeholder="Previous password"
// 											/>

// 											<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
// 												{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
// 											</span>
// 										</div>
// 									</div>
// 									{/* ) : null} */}

// 									<div>
// 										<label htmlFor="confirmPassword">Confirm Password:</label>
// 										<div className="update-form-input">
// 											<input type={show === true ? "text" : "password"} name="confirmPassword" onChange={(e) => SubmissionInfo(e)} />

// 											<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
// 												{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
// 											</span>
// 										</div>
// 									</div>
// 								</div>
// 							</div>

// 							<div className="form-row-center-right">
// 								<div className="form-row-center-right-wrapper">
// 									<div>
// 										{/* <label htmlFor="job">Name:</label> */}

// 										<label htmlFor="title">job title:</label>
// 										<input type="text" name="title" onChange={(e) => SubmissionInfo(e)} placeholder={user?.job?.title} />
// 									</div>

// 									<div>
// 										{/* <label htmlFor="description">job description:</label> */}
// 										<label>new Job Description:</label>
// 										<textarea
// 											name="description"
// 											// value={row?.description} onChange={(e) => handleRowChange(index, e)}
// 											placeholder="New Job Description"></textarea>
// 									</div>

// 									{/* {logUser?.permissions?.canChangeRole && ( */}
// 									<div>
// 										<label>New Role:</label>
// 										{/* here */}
// 										<select
// 											name="newRole"
// 											// value={row?.newRole} onChange={(e) => handleRowChange(index, e)}
// 										>
// 											<option value="" disabled>
// 												Select Role
// 											</option>
// 											<option value="admin">Admin</option>
// 											<option value="subAdmin">Sub Admin</option>
// 											<option value="technician">Technician</option>
// 											<option value="user">User</option>
// 											<option value="noRole">No Role</option>
// 										</select>
// 									</div>

// 									{/* )} */}
// 								</div>
// 							</div>
// 						</div>

// 						{/*!!!!!!!!!  center   !!!!!!!!*/}
// 						<div className="form-row-center-bottom">
// 							{/* {logUser?.permissions?.canChangeRole && ( */}
// 							<div>
// 								{/* <label>New Permissions:</label> */}
// 								<div className="permissions-grid">
// 									{/* User-related permissions */}
// 									<div>
// 										<label>User Permissions</label>
// 										<ul className="permissions-list">
// 											{/* {Object.keys(row?.newPermissions)
// 															?.filter((permKey) => permKey.includes("Users") || permKey?.includes("Role"))
// 															?.map((permKey) => (
// 																<li key={permKey}>
// 																	<label>
// 																		{formatKey(permKey)}
// 																		<input onChange={(e) => handleRowChange(index, e)} type="checkbox" name={permKey} checked={row?.newPermissions[permKey]} />
// 																	</label>
// 																</li>
// 															))} */}
// 										</ul>
// 									</div>

// 									{/* make sure that the permissions works  they are not being updated when they are click */}

// 									{/* Self-related permissions */}
// 									<div>
// 										<label>Self Permissions</label>
// 										<ul className="permissions-list">
// 											{
// 												/** make sure that the permissions works  they are not being updated when they are click */
// 												// Object.keys(row?.newPermissions)
// 												// 	.filter((permKey) => permKey.includes("Self"))
// 												// 	.map((permKey) => (
// 												// 		// find a way to use the whole link  as the btn no just the checkbox
// 												// 		<li key={permKey}>
// 												// 			<label>
// 												// 				{formatKey(permKey)}
// 												// 				<input type="checkbox" name={permKey} checked={row?.newPermissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
// 												// 			</label>
// 												// 		</li>
// 												// 	))
// 											}
// 										</ul>
// 									</div>
// 								</div>
// 							</div>
// 							{/* )} */}
// 						</div>
// 					</div>
// 				</div>

// 				<div className="validation"> {/* <p color="red"> {validation} </p>{" "} */}</div>
// 				<button type="submit" disabled={updateLoading}>
// 					{updateLoading ? " Updating..." : "Update"}
// 				</button>

// 				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
// 			</form>
// 		</div>
// 		// </div>
// 	);
// }
