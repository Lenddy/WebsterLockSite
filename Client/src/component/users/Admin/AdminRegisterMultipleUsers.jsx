import { useState, useEffect, useRef } from "react";
import { useMutation } from "@apollo/client";
import { Link } from "react-router-dom";
import { register_multiple_Users } from "../../../../graphQL/mutations/mutations";

export default function AdminRegisterMultipleUsers({ userToke }) {
	const [show, setShow] = useState(false);
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

	useEffect(() => {
		if (lastRowRef.current) {
			lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [rows]);

	const [adminRegisterMultipleUserProfiles, { loading, error: updateError }] = useMutation(register_multiple_Users);

	// Update text, select, or checkbox values for a specific row
	const handleRowChange = (index, e) => {
		const { name, value, type, checked } = e.target;

		setRows((prev) => {
			const newRows = [...prev];
			if (type === "checkbox") {
				newRows[index].permissions[name] = checked;
			} else {
				newRows[index][name] = value;
			}
			return newRows;
		});
	};

	// Add a new row
	const addRow = () => {
		setRows([
			...rows,
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

	return (
		<div>
			<div>
				<div>
					<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
						Log out
					</Link>
				</div>

				<div>
					<Link to={"/user/all"}> all users</Link>
				</div>

				<div>
					<Link to={"/user/admin/update"}>admin update users</Link>
				</div>

				<div>
					<Link to={"/user/register"}>register user</Link>
				</div>

				<div>
					<Link to={`/material/request/all`}>all material requests</Link>
				</div>
			</div>
			<h1>Admin register (Multiple)</h1>
			<form onSubmit={submit}>
				{rows.map((row, index) => (
					<div key={index} ref={index === rows.length - 1 ? lastRowRef : null} style={{ border: "1px solid gray", padding: "1rem", marginBottom: "1rem" }}>
						<h3>User Row {index + 1}</h3>

						<div>
							<label>Name:</label>
							<input type="text" name="name" value={row.name} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>Email:</label>
							<input type="text" name="email" value={row.email} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>Password:</label>
							<input type={show ? "text" : "password"} name="password" value={row.password} onChange={(e) => handleRowChange(index, e)} />
							<button type="button" onClick={() => setShow(!show)}>
								{show ? "Hide" : "Show"}
							</button>
						</div>

						<div>
							<label>Confirm Password:</label>
							<input type={show ? "text" : "password"} name="confirmPassword" value={row.confirmPassword} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>Job Title:</label>
							<input type="text" name="title" value={row.title} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>Job Description:</label>
							<input type="text" name="description" value={row.description} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>Role:</label>
							<select name="role" value={row.role} onChange={(e) => handleRowChange(index, e)}>
								<option value="">Select Role</option>
								<option value="admin">Admin</option>
								<option value="subAdmin">Sub Admin</option>
								<option value="technician">Technician</option>
								<option value="user">User</option>
								<option value="noRole">No Role</option>
							</select>
						</div>

						<div>
							<label>Permissions:</label>
							<ul>
								{Object.keys(row.permissions).map((permKey) => (
									<li key={permKey}>
										<label>{permKey}</label>
										<input type="checkbox" name={permKey} checked={row.permissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
									</li>
								))}
							</ul>
						</div>

						{rows?.length > 1 ? (
							<button type="button" onClick={() => removeRow(index)}>
								Remove Row
							</button>
						) : null}
					</div>
				))}

				<button type="button" onClick={addRow}>
					+ Add Row
				</button>

				<div>
					<button type="submit" disabled={loading || !requiredFieldsFilled || hasDuplicates}>
						{loading ? "Registering..." : "Register Users"}
					</button>
				</div>

				{!requiredFieldsFilled && <p style={{ color: "red" }}> Please fill in all required fields.</p>}
				{hasDuplicates && <p style={{ color: "red" }}> Duplicate emails found: {Array.from(new Set(duplicates)).join(", ")}</p>}

				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
			</form>
		</div>
	);
}
