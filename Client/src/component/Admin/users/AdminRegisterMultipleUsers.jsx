import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext"; // use context
import { register_multiple_Users } from "../../../../graphQL/mutations/mutations";
import { jwtDecode } from "jwt-decode";
import Eye from "../../../assets/eye.svg?react";
import CloseEye from "../../../assets/closeEye.svg?react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function AdminRegisterMultipleUsers() {
	const { userToken } = useAuth(); // get token from context
	const [show, setShow] = useState(false);
	const [success, setSuccess] = useState(false);
	const navigate = useNavigate();
	const lastRowRef = useRef(null);

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
			description: "",
			title: "",
			role: "",
			department: "",
			permissions: {
				canViewAllUsers: false,
				canEditUsers: false,
				canDeleteUsers: false,
				canChangeRole: false,
				canEditSelf: true,
				canViewSelf: true,
				canDeleteSelf: false,
			},
		},
	]);

	// Decode token and scroll to last row
	useEffect(() => {
		if (lastRowRef.current) {
			lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [rows]);

	const decodedUser = userToken ? jwtDecode(userToken) : null;

	const [adminRegisterMultipleUserProfiles, { loading, error: updateError }] = useMutation(register_multiple_Users);

	// Update text, select, or checkbox values for a specific row
	const handleRowChange = (index, e) => {
		const { name, value, type, checked } = e.target;

		setRows((prev) => {
			const newRows = [...prev];

			if (type === "checkbox") newRows[index].permissions[name] = checked;
			else newRows[index][name] = value;

			return newRows;
		});
	};

	// Add a new row
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
				title: "",
				description: "",
				role: "",
				permissions: {
					canViewAllUsers: false,
					canEditUsers: false,
					canDeleteUsers: false,
					canChangeRole: false,
					canEditSelf: true,
					canViewSelf: true,
					canDeleteSelf: false,
				},
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

	// Submit all rows in one mutation
	const submit = async (e) => {
		e.preventDefault();

		try {
			await adminRegisterMultipleUserProfiles({
				variables: {
					inputs: rows.map((row) => ({
						name: row.name,
						email: row.email,
						password: row.password,
						confirmPassword: row.confirmPassword,
						role: row.role,
						employeeNum: row?.employeeNum,
						department: row?.department,
						job: {
							title: row.title,
							description: row.description,
						},
						permissions: row.permissions,
					})),
				},
				onCompleted: (res) => {
					console.log("Mutation success:", res?.registerMultipleUsers);
					alert(t("users-added-successfully"));
					setSuccess(true);
				},
				onError: (errRes) => {
					console.log("Mutation error:", errRes);
				},
			});

			console.log("Users registered");
		} catch (err) {
			console.error("Error registering users:", err);
		}
	};

	// Show nothing if token isn't loaded
	if (!decodedUser) return null;

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
								{/* <div className="form-row-top-left">
									<label>Name:</label>
									<input type="text" name="name" value={row.name} onChange={(e) => handleRowChange(index, e)} placeholder="Name" />
								</div>

								<div className="form-row-top-right">
									<label>Email:</label>
									<input type="text" name="email" value={row.email} onChange={(e) => handleRowChange(index, e)} placeholder="Email" />
								</div> */}

								<div className="form-row-top-left">
									<label htmlFor="name">{t("name")}:</label>
									<input type="text" name="name" onChange={(e) => handleRowChange(index, e)} placeholder={t("name")} />
								</div>

								<div className="form-row-top-right">
									<label htmlFor="email">{t("email")}:</label>
									<input type="text" name="email" onChange={(e) => handleRowChange(index, e)} placeholder={t("email")} />
								</div>

								<div className="form-row-top-left">
									<label htmlFor="employeeNun">{t("employee-number")}:</label>
									<input type="text" name="employeeNum" onChange={(e) => handleRowChange(index, e)} placeholder={t("employee-number")} />
								</div>

								<div className="form-row-top-right">
									<label htmlFor="department">{t("department")}:</label>
									<input type="text" name="department" onChange={(e) => handleRowChange(index, e)} placeholder={t("department")} />
								</div>
							</div>

							<div className="form-row-center-container">
								<div className="form-row-center-left">
									<div className="form-row-center-left-wrapper">
										<div>
											<label>{t("password")}:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="password" value={row.password} onChange={(e) => handleRowChange(index, e)} placeholder={t("password")} />
												<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
													{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
												</span>
											</div>
										</div>

										<div>
											<label>{t("confirm-password")}:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="confirmPassword" value={row.confirmPassword} onChange={(e) => handleRowChange(index, e)} placeholder={t("confirm-password")} />
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
											<label>{t("job-title")}:</label>
											<input type="text" name="title" value={row.title} onChange={(e) => handleRowChange(index, e)} placeholder="Job Title" />
										</div>
										<div>
											<label>{t("job-description")}:</label>
											<textarea name="description" value={row.description} onChange={(e) => handleRowChange(index, e)} placeholder={t("job-description")}></textarea>
										</div>

										{/* Only show role selection if user has permission */}
										{decodedUser?.permissions?.canChangeRole && (
											<div>
												<label>{t("role")}:</label>
												<select name="role" value={row.role} onChange={(e) => handleRowChange(index, e)}>
													<option value="">{t("select-role")}</option>
													{decodedUser.role === "headAdmin" && <option value="headAdmin">{t("head-admin")}</option>}
													<option value="admin">{t("admin")}</option>
													<option value="subAdmin">{t("sub-admin")}</option>
													<option value="technician">{t("technician")}</option>
													<option value="user">{t("user")}</option>
													<option value="noRole">{t("no-role")}</option>
												</select>
											</div>
										)}
									</div>
								</div>

								{/* Permissions checkboxes */}
								{decodedUser?.permissions?.canChangeRole && (
									<div className="form-row-center-bottom">
										<label>{t("permissions")}:</label>
										<div className="permissions-grid">
											<div>
												<ul className="permissions-list">
													{Object.keys(row?.permissions)
														.filter((permKey) => permKey.includes("Users") || permKey.includes("Role"))
														.map((permKey) => (
															<li key={permKey}>
																<label>
																	{/* {formatKey(permKey)} */}
																	{translatePermissionKey(permKey)}
																	<input type="checkbox" name={permKey} checked={row?.permissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
																</label>
															</li>
														))}
												</ul>
											</div>

											<div>
												<ul className="permissions-list">
													{Object.keys(row?.permissions)
														.filter((permKey) => permKey.includes("Self"))
														.map((permKey) => (
															<li key={permKey}>
																<label>
																	{/* {formatKey(permKey)} */}
																	{translatePermissionKey(permKey)}
																	<input type="checkbox" name={permKey} checked={row?.permissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
																</label>
															</li>
														))}
												</ul>
											</div>
										</div>
									</div>
								)}
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
