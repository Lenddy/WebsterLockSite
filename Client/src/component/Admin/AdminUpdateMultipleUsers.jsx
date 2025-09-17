import { useState, useEffect, useRef } from "react";
import { useMutation } from "@apollo/client";
import { Link, useLocation, useParams } from "react-router-dom";
import { admin_update_multiple_users } from "../../../graphQL/mutations/mutations";
import Select from "react-select";
import Fuse from "fuse.js";
import { get_all_users } from "../../../graphQL/queries/queries";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";

export default function AdminUpdateMultipleUsers({ LaterUserId, user }) {
	const [show, setShow] = useState(false);
	const [users, setUsers] = useState([]);
	const { error, loading, data, refetch } = useQuery(get_all_users);
	const [logUser, setLogUser] = useState({});
	const lastRowRef = useRef(null);
	const location = useLocation();

	const { userId } = useParams();

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
			// locked: false, //ensure new rows are never locked
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
			setUsers(data.getAllUsers);

			// 🔹 Auto-select user from params if found
			if (userId) {
				const selectedUser = data.getAllUsers.find((u) => u.id === userId);
				if (selectedUser) {
					setRows((prev) => {
						const newRows = [...prev];
						newRows[0] = {
							...newRows[0],
							id: selectedUser.id,
							// name: selectedUser.name,
							previousEmail: selectedUser.email,
							locked: true, // lock the row
							// 🔹 prefill existing role + permissions
							newRole: selectedUser.role || "",
							newPermissions: {
								...newRows[0].newPermissions, // keep defaults
								...selectedUser.permissions, // overwrite with actual perms
							},
						};
						return newRows;
					});
				}
			}
		}
		if (error) {
			console.log("there was an error", error);
		}
	}, [loading, data, error, userId, location]);

	//! for tomorrow

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
				locked: false, // ensure new rows are never locked
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
		// out side container
		<div className="update-container">
			{/* form  */}
			<form className="update-form" onSubmit={submit}>
				{/* inside the form top title  */}
				<h1 className="update-form-title">Admin update (Multiple)</h1>

				{/* wrapper for the  inputs and info */}
				<div className="update-form-wrapper">
					{rows.map((row, index) => (
						// container for every row that is added
						<div className="update-form-row" key={index} ref={index === row?.length - 1 ? lastRowRef : null}>
							{/* show the count of the row */}
							<h3 className="form-row-count">User Row {index + 1}</h3>
							{/* container for the top information*/}
							<div className="form-row-top-container">
								{/* left side of the top container */}
								<div className="form-row-top-left">
									<Select
										classNamePrefix="update-form-row-select"
										options={userOptions}
										value={userOptions.find((opt) => opt.value === row?.id) || null}
										onChange={(selected) => {
											if (row?.locked) return; //  Prevent changes if locked
											setRows((prev) => {
												const newRows = [...prev];
												newRows[index].id = selected?.value || "";
												newRows[index].previousEmail = selected?.email || "";
												return newRows;
											});
										}}
										placeholder="Select user by name/email"
										isClearable={!row?.locked} //  Don't allow clearing if locked
										isSearchable={!row?.locked} //  Disable search if locked
										isDisabled={row?.locked} //  Disable Select if locked
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
									<label>Previous Email:</label>
									<input type="text" name="previousEmail" value={row?.previousEmail} onChange={(e) => handleRowChange(index, e)} disabled />
								</div>
							</div>

							{/*here goes all the other info */}

							{rows.length > 1 && (
								<button type="button" onClick={() => removeRow(index)} disabled={row.locked && index === 0}>
									Remove Row
								</button>
							)}
						</div>
					))}
				</div>
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

//! other info

// {/*  container for center information */}
// 						<div className="form-row-center-container">
// 							{/* left side of the center row */}
// 							<div className="form-row-center-left">
// 								<div className="form-row-center-1">
// 									<div>
// 										<label>New Name:</label>
// 										<input type="text" name="name" value={row?.name} onChange={(e) => handleRowChange(index, e)} />
// 									</div>

// 									<div>
// 										<label>New Email:</label>
// 										<input type="text" name="newEmail" value={row?.newEmail} onChange={(e) => handleRowChange(index, e)} />
// 									</div>
// 								</div>

// 								<div className="form-row-center-2">
// 									{logUser.role !== "headAdmin" ? (
// 										<div>
// 											<label>Previous Password:</label>
// 											<input type={show ? "text" : "password"} name="previousPassword" value={row?.previousPassword} onChange={(e) => handleRowChange(index, e)} />
// 											<button type="button" onClick={() => setShow(!show)}>
// 												{show ? "Hide" : "Show"}
// 											</button>
// 										</div>
// 									) : null}

// 									<div>
// 										<label>New Password:</label>
// 										<input type={show ? "text" : "password"} name="newPassword" value={row?.newPassword} onChange={(e) => handleRowChange(index, e)} />
// 										<button type="button" onClick={() => setShow(!show)}>
// 											{show ? "Hide" : "Show"}
// 										</button>
// 									</div>

// 									<div>
// 										<label>Confirm New Password:</label>
// 										<input type={show ? "text" : "password"} name="confirmNewPassword" value={row?.confirmNewPassword} onChange={(e) => handleRowChange(index, e)} />
// 										<button type="button" onClick={() => setShow(!show)}>
// 											{show ? "Hide" : "Show"}
// 										</button>
// 									</div>
// 								</div>
// 							</div>

// 							{/* right side of the center row */}
// 							<div className="form-row-center-right">
// 								<div className="form-row-center-3">
// 									<div>
// 										<label>New Job Title:</label>
// 										<input type="text" name="title" value={row?.title} onChange={(e) => handleRowChange(index, e)} />
// 									</div>
// 									<div>
// 										<label>new Job Description:</label>
// 										{/* <input type="text"  /> */}

// 										<textarea name="description" value={row?.description} onChange={(e) => handleRowChange(index, e)} cols={30} rows={3}></textarea>
// 									</div>
// 								</div>

// 								{logUser?.permissions?.canChangeRole ? (
// 									<div className="form-row-center-4">
// 										<div>
// 											<label>New Role:</label>

// 											<select name="newRole" value={row?.newRole} onChange={(e) => handleRowChange(index, e)}>
// 												<option value="" disabled>
// 													Select Role
// 												</option>
// 												<option value="admin">Admin</option>
// 												<option value="subAdmin">Sub Admin</option>
// 												<option value="technician">Technician</option>
// 												<option value="user">User</option>
// 												<option value="noRole">No Role</option>
// 											</select>
// 										</div>

// 										<div>
// 											<label>New Permissions:</label>
// 											<ul>
// 												{Object.keys(row?.newPermissions).map((permKey) => (
// 													<li key={permKey}>
// 														<label>{permKey}</label>
// 														<input type="checkbox" name={permKey} checked={row?.newPermissions[permKey]} onChange={(e) => handleRowChange(index, e)} />
// 													</li>
// 												))}
// 											</ul>
// 										</div>
// 									</div>
// 								) : null}
// 							</div>
// 						</div>
