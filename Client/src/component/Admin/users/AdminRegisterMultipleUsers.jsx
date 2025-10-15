import { useState, useEffect, useRef } from "react";
import { useMutation } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext"; // use context
import { register_multiple_Users } from "../../../../graphQL/mutations/mutations";
import { jwtDecode } from "jwt-decode";
import Eye from "../../../assets/eye.svg?react";
import CloseEye from "../../../assets/closeEye.svg?react";

export default function AdminRegisterMultipleUsers() {
	const { userToken } = useAuth(); // get token from context
	const [show, setShow] = useState(false);
	const [success, setSuccess] = useState(false);

	const lastRowRef = useRef(null);

	const [rows, setRows] = useState([
		{
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
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
						job: {
							title: row.title,
							description: row.description,
						},
						permissions: row.permissions,
					})),
				},
				onCompleted: (res) => {
					console.log("Mutation success:", res?.registerMultipleUsers);
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
				<h1 className="register-form-title">Admin register (Multiple)</h1>

				<div className="register-form-wrapper">
					{rows.map((row, index) => (
						<div className="register-form-row" key={index} ref={index === rows.length - 1 ? lastRowRef : null}>
							<h3 className="form-row-count">User Row {index + 1}</h3>

							<div className="form-row-top-container">
								<div className="form-row-top-left">
									<label>Name:</label>
									<input type="text" name="name" value={row.name} onChange={(e) => handleRowChange(index, e)} placeholder="Name" />
								</div>

								<div className="form-row-top-right">
									<label>Email:</label>
									<input type="text" name="email" value={row.email} onChange={(e) => handleRowChange(index, e)} placeholder="Email" />
								</div>
							</div>

							<div className="form-row-center-container">
								<div className="form-row-center-left">
									<div className="form-row-center-left-wrapper">
										<div>
											<label>Password:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="password" value={row.password} onChange={(e) => handleRowChange(index, e)} placeholder="Password" />
												<span className="update-form-show-hide" type="button" onClick={() => setShow(!show)}>
													{show === false ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
												</span>
											</div>
										</div>

										<div>
											<label>Confirm Password:</label>
											<div className="update-form-input">
												<input type={show ? "text" : "password"} name="confirmPassword" value={row.confirmPassword} onChange={(e) => handleRowChange(index, e)} placeholder="Confirm Password" />
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
											<label>Job Title:</label>
											<input type="text" name="title" value={row.title} onChange={(e) => handleRowChange(index, e)} placeholder="Job Title" />
										</div>
										<div>
											<label>Job Description:</label>
											<textarea name="description" value={row.description} onChange={(e) => handleRowChange(index, e)} placeholder="Description"></textarea>
										</div>

										{/* Only show role selection if user has permission */}
										{decodedUser?.permissions?.canChangeRole && (
											<div>
												<label>Role:</label>
												<select name="role" value={row.role} onChange={(e) => handleRowChange(index, e)}>
													<option value="">Select Role</option>
													{decodedUser.role === "headAdmin" && <option value="headAdmin">Head Admin</option>}
													<option value="admin">Admin</option>
													<option value="subAdmin">Sub Admin</option>
													<option value="technician">Technician</option>
													<option value="user">User</option>
													<option value="noRole">No Role</option>
												</select>
											</div>
										)}
									</div>
								</div>

								{/* Permissions checkboxes */}
								{decodedUser?.permissions?.canChangeRole && (
									<div className="form-row-center-bottom">
										<label>Permissions:</label>
										<div className="permissions-grid">
											<div>
												<ul className="permissions-list">
													{Object.keys(row?.permissions)
														.filter((permKey) => permKey.includes("Users") || permKey.includes("Role"))
														.map((permKey) => (
															<li key={permKey}>
																<label>
																	{formatKey(permKey)}
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
																	{formatKey(permKey)}
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
										Remove Row
									</span>
								</div>
							)}
						</div>
					))}
				</div>

				{success && <p style={{ color: "green" }}>Users registered</p>}
				{!requiredFieldsFilled && <p style={{ color: "red" }}>Please fill in all required fields.(Name, Email, Password, Confirm Password, Role, Permission)</p>}
				{hasDuplicates && <p style={{ color: "red" }}>Duplicate emails found: {Array.from(new Set(duplicates)).join(", ")}</p>}
				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}

				<div className="form-action-btn">
					<span className="form-add-row-btn" type="button" onClick={addRow}>
						+ Add Row
					</span>

					<div>
						<button className="form-submit-btn" type="submit" disabled={loading || !requiredFieldsFilled || hasDuplicates}>
							{loading ? "Registering..." : "Register Users"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
