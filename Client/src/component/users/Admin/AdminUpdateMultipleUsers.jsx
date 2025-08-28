import { useState, useEffect, useRef } from "react";
import { useMutation } from "@apollo/client";
import { Link } from "react-router-dom";
import { admin_update_multiple_users } from "../../../../graphQL/mutations/mutations";
// import { get_all_users } from "../../../graphQL/queries/queries";
// import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries

export default function AdminUpdateMultipleUsers({ userId, user }) {
	const [show, setShow] = useState(false);
	const [users, setUsers] = useState([]);
	// const { error, loading, data, refetch } = useQuery(get_all_users);
	const lastRowRef = useRef(null);

	const [rows, setRows] = useState([
		{
			id: "",
			name: "",
			previousEmail: "",
			newEmail: "",
			password: "",
			confirmPassword: "",
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
		},
	]);

	useEffect(() => {
		if (lastRowRef.current) {
			lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}

		// if (loading) {
		// 	console.log("loading");
		// }
		// if (data) {
		// 	console.log(data.getAllUsers);
		// 	setUsers(data.getAllUsers);
		// }
		// if (error) {
		// 	console.log("there was an error", error);
		// }
		// , loading, data, error
	}, [rows]);

	const [adminChangeMultipleUserProfiles, { loading: updateLoading, error: updateError }] = useMutation(admin_update_multiple_users);

	// 🔹 Handle input changes
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
	};

	// 🔹 Add row
	const addRow = () => {
		setRows([
			...rows,
			{
				id: "",
				name: "",
				previousEmail: "",
				newEmail: "",
				password: "",
				confirmPassword: "",
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
			},
		]);
	};

	// 🔹 Remove row
	const removeRow = (index) => {
		setRows((prevRows) => prevRows.filter((_, i) => i !== index));
	};

	// 🔹 Validation
	const hasEmptyRequiredFields = rows.some((row) => !row.id || !row.name || !row.previousEmail || !row.newEmail || !row.password || !row.confirmPassword);

	const hasDuplicateEmails = (() => {
		const seen = new Set();
		for (let r of rows) {
			if (seen.has(r.newEmail)) return true;
			if (r.newEmail) seen.add(r.newEmail);
		}
		return false;
	})();

	const isFormInvalid = hasEmptyRequiredFields || hasDuplicateEmails;

	// 🔹 Submit
	const submit = async (e) => {
		e.preventDefault();
		try {
			await adminChangeMultipleUserProfiles({
				variables: {
					inputs: rows.map((row) => ({
						id: row.id,
						name: row.name,
						previousEmail: row.previousEmail,
						newEmail: row.newEmail,
						password: row.password,
						confirmPassword: row.confirmPassword,
						newRole: row.newRole,
						job: {
							title: row.title,
							description: row.description,
						},
						newPermissions: row.newPermissions,
					})),
				},
				onCompleted: (res) => {
					console.log("Mutation success:", res);
				},
				onError: (errRes) => {
					console.log("Mutation error:", errRes);
				},
			});
			console.log(" Users updated");
		} catch (err) {
			console.error(" Error updating users:", err);
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

			<h1>Admin update (Multiple)</h1>
			<form onSubmit={submit}>
				{rows.map((row, index) => (
					<div key={index} ref={index === rows.length - 1 ? lastRowRef : null} style={{ border: "1px solid gray", padding: "1rem", marginBottom: "1rem" }}>
						<h3>User Row {index + 1}</h3>

						<div>
							<label>User ID:</label>
							<input type="text" name="id" value={row.id} onChange={(e) => handleRowChange(index, e)} placeholder="Target user ID" />
						</div>

						<div>
							<label>Name:</label>
							<input type="text" name="name" value={row.name} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>Previous Email:</label>
							<input type="text" name="previousEmail" value={row.previousEmail} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>New Email:</label>
							<input type="text" name="newEmail" value={row.newEmail} onChange={(e) => handleRowChange(index, e)} />
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
							<select name="newRole" value={row.newRole} onChange={(e) => handleRowChange(index, e)}>
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

						<div>
							<label>Permissions:</label>
							<ul>
								{Object.keys(row.newPermissions).map((permKey) => (
									<li key={permKey}>
										<label>{permKey}</label>
										<input type="checkbox" name={permKey} checked={row.newPermissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
									</li>
								))}
							</ul>
						</div>

						{rows.length > 1 && (
							<button type="button" onClick={() => removeRow(index)}>
								Remove Row
							</button>
						)}
					</div>
				))}

				<button type="button" onClick={addRow}>
					+ Add Row
				</button>

				<div>
					<button type="submit" disabled={updateLoading || isFormInvalid}>
						{updateLoading ? "Updating..." : "Update Users"}
					</button>
				</div>

				{hasEmptyRequiredFields && <p style={{ color: "red" }}>⚠️ All required fields must be filled.</p>}
				{hasDuplicateEmails && <p style={{ color: "red" }}>⚠️ Duplicate emails found in rows.</p>}
				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
			</form>
		</div>
	);
}

// import { useState, useEffect, useRef } from "react";
// import { useMutation } from "@apollo/client";
// import { Link } from "react-router-dom";
// import { admin_update_multiple_users } from "../../../../graphQL/mutations/mutations"; // <-- your new multi-update mutation

// export default function AdminUpdateMultipleUsers({ userId, user }) {
// 	const [show, setShow] = useState(false);
// 	const lastRowRef = useRef(null);

// 	const [rows, setRows] = useState([
// 		{
// 			id: "", // 🔹 include the target user's id here!
// 			name: "",
// 			previousEmail: "",
// 			newEmail: "",
// 			password: "",
// 			confirmPassword: "",
// 			title: "",
// 			description: "",
// 			newRole: "",
// 			newPermissions: {
// 				canViewAllUsers: false,
// 				canEditUsers: false,
// 				canDeleteUsers: false,
// 				canChangeRole: false,
// 				canEditSelf: true,
// 				canViewSelf: true,
// 				canDeleteSelf: false,
// 			},
// 		},
// 	]);

// 	useEffect(() => {
// 		if (lastRowRef.current) {
// 			lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
// 		}
// 	}, [rows]);

// 	const [adminChangeMultipleUserProfiles, { loading: updateLoading, error: updateError }] = useMutation(admin_update_multiple_users);

// 	// 🔹 Update text, select, or checkbox values for a specific row
// 	const handleRowChange = (index, e) => {
// 		const { name, value, type, checked } = e.target;

// 		setRows((prev) => {
// 			const newRows = [...prev];
// 			if (type === "checkbox") {
// 				newRows[index].newPermissions[name] = checked;
// 			} else {
// 				newRows[index][name] = value;
// 			}
// 			return newRows;
// 		});
// 	};

// 	// Add a new row
// 	const addRow = () => {
// 		setRows([
// 			...rows,
// 			{
// 				id: "",
// 				name: "",
// 				previousEmail: "",
// 				newEmail: "",
// 				password: "",
// 				confirmPassword: "",
// 				title: "",
// 				description: "",
// 				newRole: "",
// 				newPermissions: {
// 					canViewAllUsers: false,
// 					canEditUsers: false,
// 					canDeleteUsers: false,
// 					canChangeRole: false,
// 					canEditSelf: true,
// 					canViewSelf: true,
// 					canDeleteSelf: false,
// 				},
// 			},
// 		]);
// 	};

// 	// Remove a row
// 	const removeRow = (index) => {
// 		setRows((prevRows) => prevRows.filter((_, i) => i !== index));
// 	};

// 	// Submit all rows in one mutation
// 	const submit = async (e) => {
// 		e.preventDefault();
// 		try {
// 			await adminChangeMultipleUserProfiles({
// 				variables: {
// 					inputs: rows.map((row) => ({
// 						id: row.id,
// 						name: row.name,
// 						previousEmail: row.previousEmail,
// 						newEmail: row.newEmail,
// 						password: row.password,
// 						confirmPassword: row.confirmPassword,
// 						newRole: row.newRole,
// 						job: {
// 							title: row.title,
// 							description: row.description,
// 						},
// 						newPermissions: row.newPermissions,
// 					})),
// 				},
// 			});
// 			console.log("✅ Users updated");
// 		} catch (err) {
// 			console.error("❌ Error updating users:", err);
// 		}
// 	};

// 	return (
// 		<div>
// 			<div>
// 				<Link to={`/user/${userId}`}> user</Link>
// 			</div>
// 			<h1>Admin update (Multiple)</h1>
// 			<form onSubmit={submit}>
// 				{rows.map((row, index) => (
// 					<div key={index} ref={index === rows.length - 1 ? lastRowRef : null} style={{ border: "1px solid gray", padding: "1rem", marginBottom: "1rem" }}>
// 						<h3>User Row {index + 1}</h3>

// 						<div>
// 							<label>User ID:</label>
// 							<input type="text" name="id" value={row.id} onChange={(e) => handleRowChange(index, e)} placeholder="Target user ID" />
// 						</div>

// 						<div>
// 							<label>Name:</label>
// 							<input type="text" name="name" value={row.name} onChange={(e) => handleRowChange(index, e)} />
// 						</div>

// 						<div>
// 							<label>Previous Email:</label>
// 							<input type="text" name="previousEmail" value={row.previousEmail} onChange={(e) => handleRowChange(index, e)} />
// 						</div>

// 						<div>
// 							<label>New Email:</label>
// 							<input type="text" name="newEmail" value={row.newEmail} onChange={(e) => handleRowChange(index, e)} />
// 						</div>

// 						<div>
// 							<label>Password:</label>
// 							<input type={show ? "text" : "password"} name="password" value={row.password} onChange={(e) => handleRowChange(index, e)} />
// 							<button type="button" onClick={() => setShow(!show)}>
// 								{show ? "Hide" : "Show"}
// 							</button>
// 						</div>

// 						<div>
// 							<label>Confirm Password:</label>
// 							<input type={show ? "text" : "password"} name="confirmPassword" value={row.confirmPassword} onChange={(e) => handleRowChange(index, e)} />
// 						</div>

// 						<div>
// 							<label>Job Title:</label>
// 							<input type="text" name="title" value={row.title} onChange={(e) => handleRowChange(index, e)} />
// 						</div>

// 						<div>
// 							<label>Job Description:</label>
// 							<input type="text" name="description" value={row.description} onChange={(e) => handleRowChange(index, e)} />
// 						</div>

// 						<div>
// 							<label>Role:</label>
// 							<select name="newRole" value={row.newRole} onChange={(e) => handleRowChange(index, e)}>
// 								<option value="" selected disabled>
// 									Select Role
// 								</option>
// 								<option value="admin">Admin</option>
// 								<option value="subAdmin">Sub Admin</option>
// 								<option value="technician">Technician</option>
// 								<option value="user">User</option>
// 								<option value="noRole">No Role</option>
// 							</select>
// 						</div>

// 						<div>
// 							<label>Permissions:</label>
// 							<ul>
// 								{Object.keys(row.newPermissions).map((permKey) => (
// 									<li key={permKey}>
// 										<label>{permKey}</label>
// 										<input type="checkbox" name={permKey} checked={row.newPermissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
// 									</li>
// 								))}
// 							</ul>
// 						</div>

// 						{rows?.length > 1 ? (
// 							<button type="button" onClick={() => removeRow(index)}>
// 								Remove Row
// 							</button>
// 						) : null}
// 					</div>
// 				))}

// 				<button type="button" onClick={addRow}>
// 					+ Add Row
// 				</button>

// 				<div>
// 					<button type="submit" disabled={updateLoading}>
// 						{updateLoading ? "Updating..." : "Update Users"}
// 					</button>
// 				</div>

// 				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
// 			</form>
// 		</div>
// 	);
// }
