import { useState, useEffect, useRef } from "react";
import { useMutation } from "@apollo/client";
import { Link } from "react-router-dom";
import { admin_update_multiple_users } from "../../../graphQL/mutations/mutations";
import Select from "react-select";
import Fuse from "fuse.js";
import { get_all_users } from "../../../graphQL/queries/queries";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";

export default function AdminUpdateMultipleUsers({ userId, user }) {
	const [show, setShow] = useState(false);
	const [users, setUsers] = useState([]);
	const { error, loading, data, refetch } = useQuery(get_all_users);
	const [logUser, setLogUser] = useState({});
	const lastRowRef = useRef(null);

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
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (lastRowRef.current) {
			lastRowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}

		if (loading) {
			console.log("loading");
		}
		if (data) {
			// console.log(data.getAllUsers);
			setUsers(data.getAllUsers);
		}
		if (error) {
			console.log("there was an error", error);
		}
	}, [rows, users, loading, data, error]);

	const [adminChangeMultipleUserProfiles, { loading: updateLoading, error: updateError }] = useMutation(admin_update_multiple_users);

	// inside your component
	const userOptions = users.map((u) => ({
		label: `${u.name} - ${u.email}`,
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

	//  Remove row
	const removeRow = (index) => {
		setRows((prevRows) => prevRows.filter((_, i) => i !== index));
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
		const noChangesMade = !row.newEmail && !row.newPassword && !row?.confirmNewPassword && !row?.role && !row?.newPermissions && !row?.name && !row?.title && !row?.description;

		if (row?.id && noChangesMade) {
			console.warn(" Row has an ID but no other fields were changed.");
			return true;
		}

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
						id: row?.id,
						name: row?.name,
						previousEmail: row?.previousEmail,
						newEmail: row?.newEmail,
						previousPassword: row?.previousPassword,
						newPassword: row?.newPassword,
						confirmNewPassword: row?.confirmNewPassword,
						newRole: row?.newRole,
						job: {
							title: row?.title,
							description: row?.description,
						},
						newPermissions: row?.newPermissions,
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
					<Link to={"/admin/user/update"}>admin update users</Link>
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
					<div key={index} ref={index === row?.length - 1 ? lastRowRef : null} style={{ border: "1px solid gray", padding: "1rem", marginBottom: "1rem" }}>
						<h3>User Row {index + 1}</h3>

						<div>
							<div>
								<label>
									Select User <span>**</span>:
								</label>
								<Select
									options={userOptions}
									value={userOptions.find((opt) => opt.value === row?.id) || null}
									onChange={(selected) => {
										setRows((prev) => {
											const newRows = [...prev];
											newRows[index].id = selected?.value || "";
											// newRows[index].name = selected?.name || "";
											newRows[index].previousEmail = selected?.email || "";
											return newRows;
										});
									}}
									placeholder="Select user by name/email"
									isClearable
									isSearchable
									filterOption={customFilter}
									styles={{
										control: (base) => ({
											...base,
											borderRadius: "12px",
											borderColor: "blue",
										}),
										option: (base, state) => ({
											...base,
											backgroundColor: state.isFocused ? "lightblue" : "white",
											color: "black",
										}),
									}}
								/>
							</div>
						</div>

						<div>
							<label>New Name:</label>
							<input type="text" name="name" value={row?.name} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>Previous Email:</label>
							<input type="text" name="previousEmail" value={row?.previousEmail} onChange={(e) => handleRowChange(index, e)} disabled />
						</div>

						<div>
							<label>New Email:</label>
							<input type="text" name="newEmail" value={row?.newEmail} onChange={(e) => handleRowChange(index, e)} />
						</div>
						{logUser.role !== "headAdmin" ? (
							<div>
								<label>Previous Password:</label>
								<input type={show ? "text" : "password"} name="previousPassword" value={row?.previousPassword} onChange={(e) => handleRowChange(index, e)} />
								<button type="button" onClick={() => setShow(!show)}>
									{show ? "Hide" : "Show"}
								</button>
							</div>
						) : null}

						<div>
							<label>New Password:</label>
							<input type={show ? "text" : "password"} name="newPassword" value={row?.newPassword} onChange={(e) => handleRowChange(index, e)} />
							<button type="button" onClick={() => setShow(!show)}>
								{show ? "Hide" : "Show"}
							</button>
						</div>

						<div>
							<label>Confirm New Password:</label>
							<input type={show ? "text" : "password"} name="confirmNewPassword" value={row?.confirmNewPassword} onChange={(e) => handleRowChange(index, e)} />
							<button type="button" onClick={() => setShow(!show)}>
								{show ? "Hide" : "Show"}
							</button>
						</div>

						<div>
							<label>New Job Title:</label>
							<input type="text" name="title" value={row?.title} onChange={(e) => handleRowChange(index, e)} />
						</div>

						<div>
							<label>new Job Description:</label>
							<input type="text" name="description" value={row?.description} onChange={(e) => handleRowChange(index, e)} />
						</div>

						{logUser?.permissions?.canChangeRole ? (
							<>
								<div>
									<label>New Role:</label>
									<select name="newRole" value={row?.newRole} onChange={(e) => handleRowChange(index, e)}>
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
									<label>New Permissions:</label>
									<ul>
										{Object.keys(row?.newPermissions).map((permKey) => (
											<li key={permKey}>
												<label>{permKey}</label>
												<input type="checkbox" name={permKey} checked={row?.newPermissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
											</li>
										))}
									</ul>
								</div>
							</>
						) : null}

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

				{hasEmptyRequiredFields && <p style={{ color: "red" }}> All required fields must be filled.</p>}
				{hasDuplicateEmails && <p style={{ color: "red" }}> Duplicate emails found in rows.</p>}
				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
			</form>
		</div>
	);
}
