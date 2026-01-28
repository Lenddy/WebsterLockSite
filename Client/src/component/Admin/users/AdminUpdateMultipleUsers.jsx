import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation } from "@apollo/client";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { admin_update_multiple_users } from "../../../../graphQL/mutations/mutations";
import Select from "react-select";
import Fuse from "fuse.js";
// import { get_all_users } from "../../../../graphQL/queries/queries";
import { useUsers } from "../../../context/UsersContext";
// import { useQuery } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";

import Eye from "../../../assets/eye.svg?react";
import CloseEye from "../../../assets/closeEye.svg?react";

import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

export default function AdminUpdateMultipleUsers() {
	const { userToken, pageLoading, loading: userLoading } = useAuth();
	const { users, loading, error } = useUsers();
	const { userId } = useParams();
	const { t } = useTranslation();

	const [show, setShow] = useState(false);
	const [success, setSuccess] = useState();
	const [logUser, setLogUser] = useState({});
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [formReset, setFormReset] = useState(false);
	const [toastOpen, setToastOpen] = useState(false);
	const [blockInput, setBlockInput] = useState(false);

	const lastRowRef = useRef(null);
	const location = useLocation();
	const navigate = useNavigate();

	const decodedUser = useMemo(() => {
		if (!userToken) return null;
		try {
			return JSON.parse(atob(userToken.split(".")[1])); // simple JWT decode
		} catch (err) {
			console.error("Invalid token", err);
			return null;
		}
	}, [userToken]);

	const canUserReview = useMemo(() => {
		if (!decodedUser) return false;

		const role = typeof decodedUser.role === "string" ? decodedUser.role : decodedUser.role?.role;

		const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
		// const isOwner = decodedUser.userId === userId;

		return hasRole;
	}, [decodedUser]);

	useEffect(() => {
		if (!canUserReview) {
			toast.warn(t("you-dont-have-permission-to-edit-users"));
			navigate("/material/request/all", { replace: true });
		}
	}, [canUserReview, navigate]);

	const translatePermissionKey = (key) => {
		const keys = {
			canViewAllUsers: "can-view-all-users",
			canEditUsers: "can-edit-users",
			canDeleteUsers: "can-delete-users",
			canChangeRole: "can-change-role",
			canViewSelf: "can-view-self",
			canEditSelf: "can-edit-self",
			canDeleteSelf: "can-delete-self",
		};
		// Use keys[key] if exists, otherwise fallback to the original key
		return t(keys[key] || key);
	};

	const [rows, setRows] = useState([
		{
			id: "",
			name: "",
			previousEmail: "",
			newEmail: "",
			previousPassword: "",
			newPassword: "",
			confirmNewPassword: "",
			title: "",
			description: "",
			newRole: "",
			employeeNum: "",
			department: "",
			newPermissions: {
				canViewAllUsers: false,
				canEditUsers: false,
				canDeleteUsers: false,
				canChangeRole: false,
				canEditSelf: true,
				canViewSelf: true,
				canDeleteSelf: false,
			},
			// locked: false, //ensure new rows are never locked
		},
	]);
	console.log("all rows", rows);

	useEffect(() => {
		setLogUser(jwtDecode(userToken));
		if (lastRowRef.current) {
			lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}

		// if (loading) {
		// 	console.log("loading");
		// }
		if (users) {
			// console.log("all user on the update many", data.getAllUsers);
			// console.log("all user on the update many", data.getAllUsers[0].employeeNum);
			// setUsers(data.getAllUsers);

			// Auto-select user from params if found
			if (userId) {
				const selectedUser = users?.find((u) => u?.id === userId);
				if (selectedUser) {
					setRows((prev) => {
						const newRows = [...prev];
						newRows[0] = {
							...newRows[0],
							id: selectedUser.id,
							employeeNum: selectedUser.employeeNum || "",
							department: selectedUser.department || "",
							previousEmail: selectedUser.email,
							locked: true, // lock the row
							// prefill existing role + permissions
							newRole: selectedUser.role || "",
							newPermissions: {
								...newRows[0].newPermissions, // keep defaults
								...selectedUser.permissions, // overwrite with actual perms
							},
						};
						// setSuccess({ success: false });
						return newRows;
					});
				}
			}
		}

		// if (error) {
		// 	console.log("there was an error", error);
		// }
		// , data,
	}, [loading, error, userId, location, users]);

	const [adminChangeMultipleUserProfiles, { loading: updateLoading, error: updateError }] = useMutation(admin_update_multiple_users);

	// inside your component
	const userOptions = users.map((u) => ({
		label: `${u?.employeeNum !== null ? u?.employeeNum : ""} ${u.name} - ${u.email}`,
		value: u.id,
		email: u.email,
		name: u.name,
	}));

	// ---------------------------
	// Custom fuzzy search filter
	// ---------------------------
	const customFilter = (option, inputValue) => {
		// If search is empty → show all
		if (!inputValue) return true;

		// Fuse.js fuzzy search across labels
		const fuse = new Fuse(userOptions, { keys: ["label"], threshold: 0.4 });

		// Keep options that fuzzy-match the search term
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	//  Handle input changes
	const handleRowChange = (index, e) => {
		const { name, value, type, checked } = e.target;

		setRows((prev) => {
			const newRows = [...prev];
			if (type === "checkbox") {
				newRows[index].newPermissions[name] = checked;
			} else {
				newRows[index][name] = value;
			}
			return newRows;
		});
		// setSuccess({ success: false });
		setSuccess(null);
	};

	//  Add row
	const addRow = () => {
		setRows([
			...rows,
			{
				id: "",
				name: "",
				previousEmail: "",
				newEmail: "",
				previousPassword: "",
				newPassword: "",
				confirmNewPassword: "",
				employeeNum: "",
				department: "",
				title: "",
				description: "",
				newRole: "",
				newPermissions: {
					canViewAllUsers: false,
					canEditUsers: false,
					canDeleteUsers: false,
					canChangeRole: false,
					canEditSelf: true,
					canViewSelf: true,
					canDeleteSelf: false,
				},
				locked: false, // ensure new rows are never locked
			},
		]);
		// setSuccess({ success: false });
		setSuccess(null);
	};

	//  Remove row
	const removeRow = (index) => {
		setRows((prevRows) => prevRows.filter((_, i) => i !== index));
		// setSuccess({ success: false });
		setSuccess(null);
	};

	// Validation
	const hasEmptyRequiredFields = rows.some((row) => {
		// 1. ID always required
		if (!row?.id) return true;

		// 2. Email change rule
		if (row?.newEmail && !row.previousEmail) return true;

		// 3. Password change rules
		if (row?.newPassword) {
			if (!row?.confirmNewPassword) return true;

			// Only require previousPassword if not headAdmin
			if (logUser.role !== "headAdmin" && !row?.previousPassword) return true;
		}

		// 4. If ID is selected but *no other field is changed*
		const noChangesMade = !row.newEmail && !row.newPassword && !row?.confirmNewPassword && !row?.role && !row?.newPermissions && !row?.name && !row?.title && !row?.description && !row?.department && !row?.employeeNum;

		if (row?.id && noChangesMade) {
			console.warn(" Row has an ID but no other fields were changed.");
			return true;
		}
		// setSuccess({ success: false });
		// setSuccess(null);

		return false; // valid row
	});

	const hasDuplicateEmails = (() => {
		const seen = new Set();
		for (let r of rows) {
			if (seen.has(r.previousEmail)) return true;
			if (seen.has(r.newEmail)) return true;

			if (r.previousEmail) seen.add(r.previousEmail);
			if (r.newEmail) seen.add(r.newEmail);
		}
		// setSuccess({ success: false });
		return false;
	})();

	const isFormInvalid = hasEmptyRequiredFields || hasDuplicateEmails;

	const formatKey = (key) => {
		return key
			.replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters
			.replace(/^./, (str) => str.toUpperCase()); // capitalize first letter
	};

	const resetForm = () => {
		setRows([
			{
				id: "",
				name: "",
				previousEmail: "",
				newEmail: "",
				previousPassword: "",
				newPassword: "",
				confirmNewPassword: "",
				employeeNum: "",
				department: "",
				title: "",
				description: "",
				newRole: "",
				newPermissions: {
					canViewAllUsers: false,
					canEditUsers: false,
					canDeleteUsers: false,
					canChangeRole: false,
					canEditSelf: true,
					canViewSelf: true,
					canDeleteSelf: false,
				},
				locked: false, // ensure new rows are never locked
			},
		]);
		// setSuccess({ success: false });
		setSuccess(null);
		// setSelectedGroups([]);
		setHasSubmitted(false);
		setFormReset(true);
	};

	const SuccessToast = ({ closeToast, resetForm }) => (
		<div>
			<p>{t("user-has-been-updated-successfully")}</p>

			<div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
				<button
					onClick={() => {
						closeToast();
						setBlockInput(false);
						navigate("/user/all");
					}}>
					{t("view-all-users")}
				</button>

				<button
					onClick={() => {
						resetForm();
						setBlockInput(false);
						// console.log("has submitted before", hasSubmitted);
						setHasSubmitted(false);
						// console.log("has submitted after", hasSubmitted);
						closeToast();
					}}>
					{t("update-more-users")}
				</button>
			</div>

			{/* <p style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>{t("duplicate-request")}</p> */}
		</div>
	);

	// Submit
	const submit = async (e) => {
		e.preventDefault();

		if (hasSubmitted === true) {
			toast.warn(t("duplicate-request-warning"), {
				// autoClose: false,
			});
			return;
		}

		const inputs = rows.map((row) => {
			const { __typename, ...cleanPermissions } = row?.newPermissions || {};

			return {
				id: row?.id,
				name: row?.name,
				previousEmail: row?.previousEmail,
				newEmail: row?.newEmail,
				previousPassword: row?.previousPassword,
				newPassword: row?.newPassword,
				confirmNewPassword: row?.confirmNewPassword,
				newRole: row?.newRole,
				employeeNum: row?.employeeNum,
				department: row?.department,
				job: {
					title: row?.title,
					description: row?.description,
				},
				newPermissions: cleanPermissions,
			};
		});

		const mutationPromise = adminChangeMultipleUserProfiles({
			variables: {
				inputs,
			},

			// onCompleted: (res) => {
			// 	console.log("Mutation success:", res);

			// 	setSuccess({ success: true, update: "Update has been completed" });
			// 	t("users-have-been-updated");
			// 	//ANCHOR - try to update the  users token  here if they match the id  start hare adminChangeMultipleUserProfiles.id and token
			// 	//TODO yo need to find a new way to update the users toke like using the subs to trigger  like you did before the auth update
			// 	console.log(res?.adminChangeMultipleUserProfiles?.id === logUser.id);
			// 	console.log("updated token", res?.adminChangeMultipleUserProfiles?.token);

			// 	// if (res?.adminChangeMultipleUserProfiles?.id === logUser.id) {

			// 	// res?.adminChangeMultipleUserProfiles.map((u) => (u.id === logUser.id ? localStorage.setItem("userToken", u.token) : null));

			// 	// }
			// },
			// onError: (errRes) => {
			// 	// console.log("Mutation error:", errRes);
			// },
		});

		toast.promise(mutationPromise, {
			pending: t("updating-users"),

			success: {
				render({ closeToast }) {
					return <SuccessToast closeToast={closeToast} resetForm={resetForm} navigate={navigate} setHasSubmitted={setHasSubmitted} t={t} />;
				},
				autoClose: false,
			},

			error: {
				render({ data }) {
					const err = data;
					if (err?.graphQLErrors?.length) {
						return err.graphQLErrors.map((e) => e.message).join(", ");
					}
					// come here
					if (err?.networkError) return t("network-error-try-again");
					return t("something-went-wrong");
				},
				autoClose: false,
			},
		});
		mutationPromise
			.then(() => {
				setHasSubmitted(true);
				setBlockInput(true);
				setSuccess({ success: true, update: "Update has been completed" });
			})
			.catch(() => {
				setHasSubmitted(false);
			});
		// console.log(" Users updated");
		// } catch (err) {
		// 	console.error(" Error updating users:", err);
		// }
	};

	return (
		// out side container
		<div className="update-container">
			{/* form  */}
			<form className="update-form" onSubmit={submit}>
				{/* inside the form top title  */}
				<h1 className="update-form-title">{t("update-multiple")}</h1>

				{/* wrapper for the  inputs and info */}
				<div className="update-form-wrapper">
					{rows.map((row, index) => (
						// container for every row that is added
						<div className="update-form-row" key={index} ref={index === row?.length - 1 ? lastRowRef : null}>
							{/* show the count of the row */}
							<h3 className="form-row-count">
								{t("user-row")} {index + 1}
							</h3>
							{/* container for the top information*/}
							<div className="form-row-top-container">
								{/* left side of the top container */}
								<div className="form-row-top-left">
									<label> {t("find-user")}</label>
									<Select
										className="form-row-top-select"
										filterOption={customFilter}
										classNamePrefix="update-form-row-select"
										options={userOptions}
										value={userOptions.find((opt) => opt.value === row?.id) || null}
										onChange={(selected) => {
											if (row?.locked) return; // Prevent changes if locked
											setRows((prev) => {
												const newRows = [...prev];
												const updatedRow = { ...newRows[index] };

												if (selected) {
													const selectedUser = users.find((u) => u.id === selected.value);

													if (selectedUser) {
														updatedRow.id = selectedUser.id;
														updatedRow.previousEmail = selectedUser.email || "";
														updatedRow.employeeNum = selectedUser.employeeNum || "";
														updatedRow.department = selectedUser.department || "";
														updatedRow.name = selectedUser.name || "";
														updatedRow.title = selectedUser.job?.title || "";
														updatedRow.description = selectedUser.job?.description || "";
														updatedRow.newRole = selectedUser.role || "";
														updatedRow.newPermissions = {
															...updatedRow.newPermissions,
															...(selectedUser.permissions || {}),
														};
													}
												} else {
													// If cleared, reset to empty
													updatedRow.id = "";
													updatedRow.previousEmail = "";
													updatedRow.employeeNum = "";
													updatedRow.department = "";
													updatedRow.name = "";
													updatedRow.title = "";
													updatedRow.description = "";
													updatedRow.newRole = "";
													updatedRow.newPermissions = {
														canViewAllUsers: false,
														canEditUsers: false,
														canDeleteUsers: false,
														canChangeRole: false,
														canEditSelf: true,
														canViewSelf: true,
														canDeleteSelf: false,
													};
												}

												newRows[index] = updatedRow;
												return newRows;
											});
										}}
										placeholder={loading ? t("loading") : t("Select-user-by-name-email")}
										isClearable={!row?.locked} //  Don't allow clearing if locked
										isSearchable={!row?.locked} //  Disable search if locked
										isDisabled={row?.locked || loading || blockInput} //  Disable Select if locked
										styles={{
											control: (base) => ({
												...base,
												borderRadius: "12px",
												borderColor: row?.locked ? "gray" : "blue", // show visually locked
												backgroundColor: row?.locked ? "#f5f5f5" : "white",
											}),
											option: (base, state) => ({
												...base,
												backgroundColor: state.isFocused ? "lightblue" : "white",
												color: "black",
											}),
										}}
									/>
								</div>

								{/* right side of the top container */}
								<div className="form-row-top-right">
									<label>{t("previous-email")}:</label>
									<input type="text" name="previousEmail" value={row?.previousEmail} onChange={(e) => handleRowChange(index, e)} disabled={loading || blockInput} placeholder={t("Previous Email")} />
								</div>

								<div className="form-row-top-left">
									<label htmlFor="employeeNun">{t("employee-number")}</label>
									<input
										type="text"
										name="employeeNum"
										value={row?.employeeNum}
										onChange={(e) => {
											(handleRowChange(index, e), console.log(row?.employeeNum));
										}}
										disabled={blockInput}
										placeholder={t("employee-number")}
									/>
								</div>

								<div className="form-row-top-right">
									<label htmlFor="department">{t("department")}</label>
									<input
										type="text"
										name="department"
										value={row?.department}
										onChange={(e) => {
											(handleRowChange(index, e), console.log(row?.department));
										}}
										placeholder={t("department")}
										disabled={blockInput}
									/>
								</div>
							</div>

							{/*here goes all the other info */}
							{/*  container for center information */}
							<div className="form-row-center-container">
								{/* left side of the center row */}
								<div className="form-row-center-left">
									{/* center left wrapper */}
									<div className="form-row-center-left-wrapper">
										<div>
											<label>{t("new name")}:</label>
											<input type="text" name="name" value={row?.name} onChange={(e) => handleRowChange(index, e)} disabled={blockInput} placeholder={t("new name")} />
										</div>

										<div>
											<label>{t("new-email")}:</label>
											<input type="email" name="newEmail" value={row?.newEmail} disabled={blockInput} onChange={(e) => handleRowChange(index, e)} placeholder={t("new-email")} />
										</div>

										{/* <div className="form-row-center-left-bottom"> */}
										{logUser.role !== "headAdmin" ? (
											<div>
												<label>{t("previous-password")}:</label>
												<div className="update-form-input">
													<input type={show ? "text" : "password"} name="previousPassword" disabled={blockInput} value={row?.previousPassword} onChange={(e) => handleRowChange(index, e)} placeholder={t("previous-password")} />

													<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
														{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
													</span>
												</div>
											</div>
										) : null}

										<div>
											<label>{t("new-password")}:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="newPassword" value={row?.newPassword} onChange={(e) => handleRowChange(index, e)} placeholder={t("new-password")} disabled={blockInput} />

												<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
													{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
												</span>
											</div>
										</div>

										<div>
											<label>{t("confirm-new-password")}:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="confirmNewPassword" value={row?.confirmNewPassword} disabled={blockInput} onChange={(e) => handleRowChange(index, e)} placeholder={t("confirm-new-password")} />
												<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
													{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* center right wrapper*/}
								<div className="form-row-center-right">
									<div className="form-row-center-right-wrapper">
										{logUser?.permissions?.canChangeRole && (
											<div>
												<label>{t("new-role")}:</label>
												{/* here */}
												<select name="newRole" value={row?.newRole} disabled={blockInput} onChange={(e) => handleRowChange(index, e)}>
													<option value="" disabled>
														{t("select-role")}
													</option>
													<option value="admin">{t("admin")}</option>
													<option value="subAdmin">{t("sub-admin")} </option>
													<option value="technician">{t("technician")}</option>
													<option value="user">{t("user")} </option>
													<option value="noRole">{t("no-role")}</option>
												</select>
											</div>
										)}
									</div>
								</div>

								<div className="form-row-center-bottom">
									{logUser?.permissions?.canChangeRole && (
										<div>
											{/* <label>New Permissions:</label> */}
											<div className="permissions-grid">
												{/* User-related permissions */}
												<div>
													<label>{t("user-permissions")}</label>
													<ul className="permissions-list">
														{Object.keys(row?.newPermissions)
															.filter((permKey) => permKey.includes("Users") || permKey.includes("Role"))
															.map((permKey) => (
																<li key={permKey}>
																	<label>
																		{/* {formatKey(permKey)} */}
																		{translatePermissionKey(permKey)}

																		<input onChange={(e) => handleRowChange(index, e)} disabled={blockInput} type="checkbox" name={permKey} checked={row?.newPermissions[permKey]} />
																	</label>
																</li>
															))}
													</ul>
												</div>

												{/* make sure that the permissions works  they are not being updated when they are click */}

												{/* Self-related permissions */}
												<div>
													<label>{t("self-permissions")}</label>
													<ul className="permissions-list">
														{
															/** make sure that the permissions works  they are not being updated when they are click */
															Object.keys(row?.newPermissions)
																.filter((permKey) => permKey.includes("Self"))
																.map((permKey) => (
																	// find a way to use the whole link  as the btn no just the checkbox
																	<li key={permKey}>
																		<label>
																			{/* {formatKey(permKey)}*/}
																			{translatePermissionKey(permKey)}
																			<input type="checkbox" name={permKey} disabled={blockInput} checked={row?.newPermissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
																		</label>
																	</li>
																))
														}
													</ul>

													{/* <ul className="permissions-list">
														{Object.keys(row?.newPermissions)
															.filter((permKey) => permKey.includes("Users") || permKey.includes("Role"))
															.map((permKey) => (
																<li key={permKey}>
																	<label>
																		{translatePermissionKey(permKey)}
																		<input onChange={(e) => handleRowChange(index, e)} type="checkbox" name={permKey} checked={row?.newPermissions[permKey]} />
																	</label>
																</li>
															))}
													</ul> */}
												</div>
											</div>
										</div>
									)}
								</div>
							</div>

							{rows.length > 1 && (
								<div className="form-row-remove-btn-container">
									<span className="remove-row-btn" type="button" onClick={() => removeRow(index)} disabled={row.locked && index === 0}>
										{t("remove-row")}
									</span>
								</div>
							)}
						</div>
					))}
				</div>

				<div className="form-action-btn">
					<span className="form-add-row-btn" type="button" onClick={addRow}>
						{t("add-row")}
					</span>

					<button className="form-submit-btn" type="submit" disabled={updateLoading || isFormInvalid}>
						{updateLoading ? t("updating") : t("update-users")}
					</button>
				</div>

				{success?.success === true && (
					<p className="form-error-message" style={{ color: "green" }}>
						{success?.update}
					</p>
				)}
				{hasEmptyRequiredFields && (
					<p className="form-error-message" style={{ color: "red" }}>
						{t("all-required-fields-must-be-filled")}
					</p>
				)}
				{hasDuplicateEmails && (
					<p p className="form-error-message" style={{ color: "red" }}>
						{t("duplicate-emails-found-in-rows")}
					</p>
				)}
				{updateError && (
					<p p className="form-error-message" style={{ color: "red" }}>
						{updateError.message}
					</p>
				)}
			</form>
		</div>
	);
}
