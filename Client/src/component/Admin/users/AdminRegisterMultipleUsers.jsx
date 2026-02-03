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
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, scopeDisplayName, roleRank, PERMISSION_DEPENDENCIES } from "../../utilities/role.config";

export default function AdminRegisterMultipleUsers() {
	const { userToken } = useAuth(); // get token from context
	const { t } = useTranslation();

	const navigate = useNavigate();
	const lastRowRef = useRef(null);

	const [show, setShow] = useState(false);
	const [success, setSuccess] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [formReset, setFormReset] = useState(false);
	const [blockInput, setBlockInput] = useState(false);

	const decodedUserCanView = useMemo(() => {
		if (!userToken) return null;
		try {
			return JSON.parse(atob(userToken.split(".")[1])); // simple JWT decode
		} catch (err) {
			console.error("Invalid token", err);
			return null;
		}
	}, [userToken]);

	const [rows, setRows] = useState([
		{
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
			employeeNum: "",
			...(decodedUserCanView.role === "subAdmin" && !can(decodedUserCanView, "role:change:any") ? { role: "user" } : { role: "" }),
			department: "",
			permissions: [],
			editPermission: false,
		},
	]);

	const decodedUser = userToken ? jwtDecode(userToken) : null;
	const isSubAdmin = decodedUser?.role === "subAdmin";

	const canUserReview = useMemo(() => {
		if (!decodedUserCanView) return false;

		const role = typeof decodedUserCanView.role === "string" ? decodedUserCanView.role : decodedUserCanView.role?.role;

		const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
		// const isOwner = decodedUserCanView.userId === userId;

		return hasRole;
	}, [decodedUserCanView]);

	const [adminRegisterMultipleUserProfiles, { loading, error: updateError }] = useMutation(register_multiple_Users);

	// Validation helpers
	const requiredFieldsFilled = rows.every((r) => r.name && r.email && r.password && r.confirmPassword && r.role);

	const emailList = rows.map((r) => r.email.trim().toLowerCase()).filter(Boolean);
	const duplicates = emailList.filter((e, i) => emailList.indexOf(e) !== i);
	const hasDuplicates = duplicates.length > 0;

	// Permission and role related functions
	const getPermissionBase = (perm) => {
		// users:read:any → users:read
		return perm.split(":").slice(0, 2).join(":");
	};

	const addPermissionWithDependencies = (currentPerms, perm) => {
		const deps = PERMISSION_DEPENDENCIES[perm] || [];
		const newPerms = new Set(currentPerms);

		newPerms.add(perm);
		deps.forEach((d) => newPerms.add(d));

		return Array.from(newPerms);
	};

	const isNonAdminRole = (role) => role === "user" || role === "noRole";

	const getVisiblePermissions = (role, allPermissions) => {
		// Non-admin → ONLY default permissions
		if (isNonAdminRole(role)) {
			return ROLE_PERMISSIONS[role]?.permissions || [];
		}

		// Admin roles → everything
		return allPermissions;
	};

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

	const formatKey = (key) => {
		return key
			.replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters
			.replace(/^./, (str) => str.toUpperCase()); // capitalize first letter
	};

	// Row manipulation functions
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
			// else if (type === "checkbox") {
			// 	const permBase = getPermissionBase(name);

			// 	if (checked) {
			// 		// Remove other permissions with same base (any ↔ own)
			// 		row.permissions = row.permissions.filter((p) => getPermissionBase(p) !== permBase);

			// 		// Add the selected permission
			// 		row.permissions.push(name);
			// 	} else {
			// 		// Remove unchecked permission
			// 		row.permissions = row.permissions.filter((p) => p !== name);
			// 	}
			// }
			else if (type === "checkbox") {
				const permBase = getPermissionBase(name); // users:read, users:update, etc.

				if (checked) {
					//  Remove other scopes of same base (any ↔ own)
					row.permissions = row.permissions.filter((p) => getPermissionBase(p) !== permBase);

					//  Add permission + its dependencies
					row.permissions = addPermissionWithDependencies(row.permissions, name);
				} else {
					//  Allow unchecking freely
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

	// Toast component
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

	// Submit handler
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

	// Effects
	useEffect(() => {
		// if (decodedUserCanView && ) {
		// 		toast.warn(t("you-dont-have-the-necessary-permission-to-view-or-perform-the-necessary-actions-on-this-page"), {
		// 			// autoClose: false,
		// 		});
		// 		navigate("/material/request/all");
		// 	}

		if (!canUserReview || !can(decodedUserCanView, "users:create:any")) {
			toast.warn(t("you-dont-have-the-necessary-permission-to-view-or-perform-the-necessary-actions-on-this-page"), {
				// autoClose: false,
			});
			navigate("/material/request/all", { replace: true });
		}
	}, [canUserReview, navigate, decodedUserCanView]);

	// Decode token and scroll to last row
	useEffect(() => {
		if (lastRowRef.current) {
			// lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [rows]);

	console.log("groupedPermissions", groupedPermissions);

	// Show nothing if token isn't loaded
	if (!decodedUser) return null;

	// console.log("this are the rows", rows);

	// TODO - FIX THE BTN THAT SHOW THE EXTRA PERMISSIONS

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
										{/* if user  can create and change role  allow them to be able to change the rolle */}

										{/*//!! role dropdown */}
										{/* Only show role selection if user has permission */}

										<div>
											<label>{t("role")}:</label>
											<select name="role" value={row.role} onChange={(e) => handleRowChange(index, e)} disabled={blockInput || !can(decodedUser, "role:change:any")}>
												<option value="" disabled>
													{t("select-role")}
												</option>

												{roleRank[decodedUser.role] >= 5 && can(decodedUser, "peers:update:any") && <option value="headAdmin">{t("head-admin")}</option>}
												{roleRank[decodedUser.role] >= 4 && can(decodedUser, "peers:update:any") && <option value="admin">{t("admin")}</option>}
												{roleRank[decodedUser.role] >= 3 && can(decodedUser, "peers:update:any") && <option value="subAdmin">{t("sub-admin")}</option>}

												<option value="user">{t("user")}</option>
												<option value="noRole">{t("no-role")}</option>
											</select>
										</div>

										{row.role && ROLE_PERMISSIONS[row.role] && <p style={{ color: "red" }}>{t(ROLE_PERMISSIONS[row.role].descriptionKey)}</p>}

										{/* {row.role ? (
											<div>
												<p style={{ color: "red" }}>{ROLE_PERMISSIONS[row.role].description}</p>
											</div>
										) : null} */}

										{/*//!! extra Permissions btn  */}
										{can(decodedUser, "users:create:any") && can(decodedUser, "role:change:any") && row.role !== "" && row.role !== "headAdmin" && (
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
													{row.editPermission ? t("hide-permission") : t("edit-permissions")}
												</button>
											</div>
										)}
									</div>
								</div>

								{/* {"come here"} */}
								{can(decodedUser, "role:change:any") && row.editPermission === true && row.role !== "headAdmin" ? (
									<div className="permissions-grid">
										{Object.entries(groupPermissions(getVisiblePermissions(row.role, ALL_PERMISSIONS))).map(([resource, actions]) => (
											<div key={resource} className="permissions-column">
												<h4 className="permissions-column-title">{t(resource)}</h4>

												{Object.values(actions).map(({ action, perms }) => (
													<div key={action} className="permissions-group">
														<strong className="permissions-action-title">{t(action)}</strong>

														<ul className="permissions-list">
															{perms.map(({ perm }) => (
																<li key={perm}>
																	<label className="permission-item">
																		<input type="checkbox" name={perm} checked={row.permissions.includes(perm)} onChange={(e) => handleRowChange(index, e)} disabled={blockInput} />
																		<span>{scopeDisplayName(perm, t)}</span>
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
