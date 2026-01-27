import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext"; // use context
import { register_multiple_Users } from "../../../../graphQL/mutations/mutations";
import { jwtDecode } from "jwt-decode";
import Eye from "../../../assets/eye.svg?react";
import CloseEye from "../../../assets/closeEye.svg?react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { can } from "../../utilities/can";
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, scopeDisplayName } from "../../utilities/role.config";

export default function AdminRegisterMultipleUsers() {
	const { userToken } = useAuth(); // get token from context
	const [show, setShow] = useState(false);
	const [success, setSuccess] = useState(false);
	const navigate = useNavigate();
	const lastRowRef = useRef(null);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [formReset, setFormReset] = useState(false);
	const [blockInput, setBlockInput] = useState(false);

	const { t } = useTranslation();

	const decodedUserCanView = useMemo(() => {
		if (!userToken) return null;
		try {
			return JSON.parse(atob(userToken.split(".")[1])); // simple JWT decode
		} catch (err) {
			console.error("Invalid token", err);
			return null;
		}
	}, [userToken]);

	const canUserReview = useMemo(() => {
		if (!decodedUserCanView) return false;

		const role = typeof decodedUserCanView.role === "string" ? decodedUserCanView.role : decodedUserCanView.role?.role;

		const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
		// const isOwner = decodedUserCanView.userId === userId;

		return hasRole;
	}, [decodedUserCanView]);

	useEffect(() => {
		if (!canUserReview) {
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
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
			employeeNum: "",
			...(decodedUserCanView.role === "subAdmin" ? { role: "user" } : { role: "" }),
			department: "",
			permissions: [],
			editPermission: false,
		},
	]);

	// Decode token and scroll to last row
	useEffect(() => {
		if (lastRowRef.current) {
			// lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [rows]);

	const decodedUser = userToken ? jwtDecode(userToken) : null;

	const [adminRegisterMultipleUserProfiles, { loading, error: updateError }] = useMutation(register_multiple_Users);

	const handleRowChange = (index, e) => {
		const { name, value, type, checked } = e.target;
		console.log("inputs", { name, value, type, checked });

		setRows((prev) => {
			const newRows = [...prev];
			const row = { ...newRows[index] };

			// ROLE CHANGE → reset permissions
			if (name === "role") {
				row.role = value;
				// row.permissions = ROLE_PERMISSIONS[value] ? [...ROLE_PERMISSIONS[value]] : [];
				row.permissions = ROLE_PERMISSIONS[value]?.permissions ? [...ROLE_PERMISSIONS[value].permissions] : [];
			}
			// CHECKBOX
			else if (type === "checkbox") {
				const permBase = getPermissionBase(name);

				if (checked) {
					// Remove other permissions with same base (any ↔ own)
					row.permissions = row.permissions.filter((p) => getPermissionBase(p) !== permBase);

					// Add the selected permission
					row.permissions.push(name);
				} else {
					// Remove unchecked permission
					row.permissions = row.permissions.filter((p) => p !== name);
				}
			}
			// NORMAL INPUT
			else {
				row[name] = value; // <-- this updates text inputs
			}

			newRows[index] = row;
			return newRows;
		});
	};

	const addRow = () => {
		setRows((prev) => [
			...prev,
			{
				name: "",
				email: "",
				password: "",
				confirmPassword: "",
				employeeNum: "",
				department: "",
				// title: "",
				// description: "",
				role: "",
				permissions: [],
				//  {
				// 	canViewAllUsers: false,
				// 	canEditUsers: false,
				// 	canDeleteUsers: false,
				// 	canChangeRole: false,
				// 	canEditSelf: true,
				// 	canViewSelf: true,
				// 	canDeleteSelf: false,
				// },
			},
		]);
	};

	// Remove a row
	const removeRow = (index) => {
		setRows((prevRows) => prevRows.filter((_, i) => i !== index));
	};

	// Validation helpers
	const requiredFieldsFilled = rows.every((r) => r.name && r.email && r.password && r.confirmPassword && r.role);

	const emailList = rows.map((r) => r.email.trim().toLowerCase()).filter(Boolean);
	const duplicates = emailList.filter((e, i) => emailList.indexOf(e) !== i);
	const hasDuplicates = duplicates.length > 0;

	const formatKey = (key) => {
		return key
			.replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters
			.replace(/^./, (str) => str.toUpperCase()); // capitalize first letter
	};

	const resetForm = () => {
		setRows([
			{
				name: "",
				email: "",
				password: "",
				confirmPassword: "",
				employeeNum: "",
				role: "",
				department: "",
				permissions: [],
			},
		]); // or your initial requests state
		// setSelectedGroups([]);
		setHasSubmitted(false);
		setFormReset(true);
	};

	// base on the role  i would like to limit the amount of permission  allow to be added

	// TODO - notify user if mutation pass/fail
	// TODO - block inputs
	// TODO - block  duplicated requests
	// TODO - give navegation btns to go see all or to stay
	// TODO - if user stays reset the form

	// if  user is a sub admin and they cant update role set the role to be a user
	const SuccessToast = ({ closeToast, resetForm }) => (
		<div>
			<p>{t("material-requests-have-been-requested-successfully")}</p>

			<div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
				<button
					onClick={() => {
						setBlockInput(false);
						closeToast();
						navigate("/user/all");
					}}>
					{t("view-all-users")}
				</button>

				<button
					onClick={() => {
						resetForm();
						setBlockInput(false);
						console.log("has submitted before", hasSubmitted);
						setHasSubmitted(false);
						console.log("has submitted after", hasSubmitted);
						closeToast();
					}}>
					{t("register-more-users")}
				</button>
			</div>
		</div>
	);

	const getPermissionBase = (perm) => {
		// users:read:any → users:read
		return perm.split(":").slice(0, 2).join(":");
	};

	const isSubAdmin = decodedUser.role === "subAdmin";

	const groupPermissions = (permissions) => {
		const result = {};

		permissions.forEach((perm) => {
			let [resource, action, scope] = perm.split(":");
			console.log("resource:", resource, "action:", action, "scope:", scope);
			// role permissions belong to users column
			if (resource === "role" || resource === "peers") {
				resource = "users";
			}

			if (!result[resource]) {
				result[resource] = {};
			}

			const actionKey = action;

			if (!result[resource][actionKey]) {
				result[resource][actionKey] = {
					action,
					perms: [],
				};
			}

			result[resource][actionKey].perms.push({
				perm,
				scope,
			});
		});

		return result;
	};

	const groupedPermissions = useMemo(() => groupPermissions(ALL_PERMISSIONS), []);

	console.log("groupedPermissions", groupedPermissions);

	// Submit all rows in one mutation
	const submit = async (e) => {
		e.preventDefault();
		if (hasSubmitted === true) {
			toast.warn(t("duplicate-request-warning"), {
				// autoClose: false,
			});
			return;
		}

		const inputs = rows.map((row) => ({
			name: row.name,
			email: row.email,
			password: row.password,
			confirmPassword: row.confirmPassword,
			role: isSubAdmin ? "user" : row.role,
			employeeNum: row?.employeeNum,
			department: row?.department,
			permissions: row.permissions,
		}));

		const mutationPromise = adminRegisterMultipleUserProfiles({
			variables: { inputs },
		});

		toast.promise(mutationPromise, {
			pending: t("creating-material-request"),

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
			})
			.catch(() => {
				setHasSubmitted(false);
			});
	};

	// Show nothing if token isn't loaded
	if (!decodedUser) return null;

	console.log("this are the rows", rows);

	// TODO - FIX THE BTN THAT SHOW THE EXTRA PERMISSIONS   PER ROLE LIMIT THE AMOUNT OF PERMISSION THAT THEY CAN HAVE ,ADD THE TRANSLATIONS TO THE SCOPE NAME DISPLAY ,  UPDATE THE UPDATE USERS COMPONENTS WITH THE SAME CHANGES

	return (
		<div className="register-container">
			<form className="register-form" onSubmit={submit}>
				<h1 className="register-form-title">{t("register-multiple")}</h1>

				<div className="register-form-wrapper">
					{rows.map((row, index) => (
						<div className="register-form-row" key={index} ref={index === rows.length - 1 ? lastRowRef : null}>
							<h3 className="form-row-count">
								{t("user-row")} {index + 1}
							</h3>

							<div className="form-row-top-container">
								<div className="form-row-top-left">
									<label htmlFor="name">{t("name")}:</label>
									<input type="text" name="name" onChange={(e) => handleRowChange(index, e)} placeholder={t("name")} disabled={blockInput} value={row.name || ""} />
								</div>

								<div className="form-row-top-right">
									<label htmlFor="email">{t("email")}:</label>
									<input type="text" name="email" onChange={(e) => handleRowChange(index, e)} placeholder={t("email")} disabled={blockInput} value={row.email || ""} />
								</div>

								<div className="form-row-top-left">
									<label htmlFor="employeeNun">{t("employee-number")}:</label>
									<input type="text" name="employeeNum" onChange={(e) => handleRowChange(index, e)} placeholder={t("employee-number")} disabled={blockInput} value={row.employeeNum || ""} />
								</div>

								<div className="form-row-top-right">
									<label htmlFor="department">{t("department")}:</label>
									<input type="text" name="department" onChange={(e) => handleRowChange(index, e)} placeholder={t("department")} disabled={blockInput} value={row.department || ""} />
								</div>
							</div>

							<div className="form-row-center-container">
								<div className="form-row-center-left">
									<div className="form-row-center-left-wrapper">
										<div>
											<label>{t("password")}:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="password" value={row.password} onChange={(e) => handleRowChange(index, e)} placeholder={t("password")} disabled={blockInput} />
												<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
													{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
												</span>
											</div>
										</div>

										<div>
											<label>{t("confirm-password")}:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="confirmPassword" value={row.confirmPassword} onChange={(e) => handleRowChange(index, e)} placeholder={t("confirm-password")} disabled={blockInput} />
												<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
													{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
												</span>
											</div>
										</div>
									</div>
								</div>

								<div className="form-row-center-right">
									<div className="form-row-center-right-wrapper">
										{/*//!! role dropdown */}
										{/* Only show role selection if user has permission */}
										{can(decodedUser, "role:change:any") && (
											<div>
												<label>{t("role")}:</label>
												<select name="role" value={row.role} onChange={(e) => handleRowChange(index, e)} disabled={blockInput}>
													<option value="" disabled>
														{t("select-role")}
													</option>
													{/* <option value="">{t("select-role")}</option> */}
													{decodedUser.role === "headAdmin" && <option value="headAdmin">{t("head-admin")}</option>}
													{decodedUser.role === "admin" && <option value="admin">{t("admin")}</option>}
													{/* <option value="admin">{t("admin")}</option> */}
													<option value="subAdmin">{t("sub-admin")}</option>
													{/* <option value="technician">{t("technician")}</option> */}
													<option value="user">{t("user")}</option>
													<option value="noRole">{t("no-role")}</option>
												</select>
											</div>
										)}

										{row.role ? (
											<div>
												<p style={{ color: "red" }}>{ROLE_PERMISSIONS[row.role].description}</p>
											</div>
										) : null}

										{/*//!! extra Permissions btn  */}
										{can(decodedUser, "role:change:any") && row.role !== "" && (decodedUser.role === "admin" || decodedUser.role === "headAdmin") && (
											<div>
												<button
													type="button"
													onClick={() =>
														setRows((prev) => {
															const newRows = [...prev];
															newRows[index] = {
																...newRows[index],
																editPermission: !newRows[index].editPermission,
															};
															return newRows;
														})
													}>
													Edit permissions
												</button>
											</div>
										)}
									</div>
								</div>

								{/* 
												i would like to  
												hide certain permission base on the roles 

												if  user or norole limit it to only their default  permission 

												if sub admin 
													they could be able to view items  but not create, update or delete items
													and you have todecide if they are going to be able to create users (most lilty not )


											*/}
								{/*//!! Permissions checkboxes */}
								{can(decodedUser, "role:change:any") && row.editPermission == true ? (
									<div className="permissions-grid">
										{Object.entries(groupedPermissions).map(([resource, actions]) => (
											<div key={resource} className="permissions-column">
												<h4 className="permissions-column-title">{t(resource)}</h4>

												{Object.values(actions).map(({ action, perms }) => (
													<div key={action} className="permissions-group">
														<strong className="permissions-action-title">{t(action)}</strong>

														<ul className="permissions-list">
															{perms.map(({ perm, scope }) => (
																<li key={perm}>
																	<label className="permission-item">
																		<input type="checkbox" name={perm} checked={row.permissions.includes(perm)} onChange={(e) => handleRowChange(index, e)} disabled={blockInput} />
																		<span>{scopeDisplayName(perm)}</span>
																	</label>
																</li>
															))}
														</ul>
													</div>
												))}
											</div>
										))}
									</div>
								) : null}
							</div>

							{rows.length > 1 && (
								<div className="form-row-remove-btn-container">
									<span className="remove-row-btn" type="button" onClick={() => removeRow(index)}>
										{t("remove-row")}
									</span>
								</div>
							)}
						</div>
					))}
				</div>

				{success && <p style={{ color: "green" }}>{t("users-registered")}</p>}
				{!requiredFieldsFilled && <p style={{ color: "red" }}>{t("please-fill-in-all-required-fields-Name-email-password-confirm-Password-role-permission")}</p>}
				{hasDuplicates && <p style={{ color: "red" }}>Duplicate emails found: {Array.from(new Set(duplicates)).join(", ")}</p>}
				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}

				<div className="form-action-btn">
					<span className="form-add-row-btn" type="button" onClick={addRow}>
						{t("add-row")}
					</span>

					<div>
						<button className="form-submit-btn" type="submit" disabled={loading || !requiredFieldsFilled || hasDuplicates}>
							{loading ? t("registering") : t("register-users")}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
