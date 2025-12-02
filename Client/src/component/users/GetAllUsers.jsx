import { useEffect, useState } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_users } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { USER_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext"; // <-- use context here
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useUsers } from "../../context/UsersContext";

export default function GetAllUsers() {
	const { userToken, setPageLoading } = useAuth(); // Get current user token from context
	const [logUser, setLogUser] = useState(null);

	const { users, loading, error } = useUsers();

	// const { error, loading, data, refetch } = useQuery(get_all_users, {
	// 	fetchPolicy: "cache-and-network",
	// });
	// const [users, setUsers] = useState([]);
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [searchValue, setSearchValue] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);

	const { t } = useTranslation();

	// Decode token once from context
	useEffect(() => {
		if (userToken) {
			try {
				setLogUser(jwtDecode(userToken)); // simple JWT decode
			} catch (err) {
				console.error("Failed to decode token:", err.message);
			}
		}
	}, [userToken]);

	// Initialize users and filtered users
	useEffect(() => {
		setPageLoading(loading);
		setFilteredUsers(users);

		// if (data) {
		// 	console.log(data.getAllUsers);
		// 	setUsers(data.getAllUsers);
		// 	setFilteredUsers(data.getAllUsers);
		// }

		// data, loading, setPageLoading
	}, [users, loading, setPageLoading]);

	// Live subscription for updates
	// useSubscription(USER_CHANGE_SUBSCRIPTION, {
	// 	onData: ({ data: subscriptionData, client }) => {
	// 		console.log("📡 Subscription raw data:", subscriptionData);

	// 		const changeEvent = subscriptionData?.data?.onUserChange;
	// 		if (!changeEvent) return;

	// 		const { eventType, changeType, change, changes } = changeEvent;

	// 		// Normalize into an array so downstream logic doesn’t have to care
	// 		const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

	// 		if (!changesArray.length) return;

	// 		console.log(`📡 User subscription event: ${eventType}, changeType: ${changeType}, count: ${changesArray.length}`);

	// 		// --- Update local state ---
	// 		setUsers((prevUsers) => {
	// 			let updated = [...prevUsers];

	// 			for (const Changes of changesArray) {
	// 				if (eventType === "created") {
	// 					const exists = prevUsers.some((u) => u.id === Changes.id);
	// 					if (!exists) updated = [...updated, Changes];
	// 				} else if (eventType === "updated") {
	// 					updated = updated.map((u) => (u.id === Changes.id ? { ...u, ...Changes } : u));
	// 				} else if (eventType === "deleted") {
	// 					updated = updated.filter((u) => u.id !== Changes.id);
	// 				}
	// 			}

	// 			// Apply search/filtering
	// 			const sorted = updated; // optionally add a sort function if needed
	// 			if (searchValue) setFilteredUsers(applyFuse(sorted, searchValue));
	// 			else setFilteredUsers(sorted);

	// 			return updated;
	// 		});

	// 		// !!!!!!!

	// 		// --- Update Apollo Cache (optional) ---
	// 		try {
	// 			client.cache.modify({
	// 				fields: {
	// 					getAllUsers(existingRefs = [], { readField }) {
	// 						let newRefs = [...existingRefs];

	// 						for (const Changes of changesArray) {
	// 							if (eventType === "deleted") {
	// 								newRefs = newRefs.filter((ref) => readField("id", ref) !== Changes.id);
	// 								continue;
	// 							}

	// 							const existingIndex = newRefs.findIndex((ref) => readField("id", ref) === Changes.id);

	// 							if (existingIndex > -1 && eventType === "updated") {
	// 								newRefs = newRefs.map((ref) =>
	// 									readField("id", ref) === Changes.id
	// 										? client.cache.writeFragment({
	// 												data: Changes,
	// 												fragment: gql`
	// 													fragment UpdatedUser on User {
	// 														id
	// 														name
	// 														email
	// 														role
	// 														permissions
	// 														job
	// 														employeeNum
	// 														department
	// 														token
	// 													}
	// 												`,
	// 										  })
	// 										: ref
	// 								);
	// 							} else if (eventType === "created") {
	// 								const newRef = client.cache.writeFragment({
	// 									data: Changes,
	// 									fragment: gql`
	// 										fragment NewUser on User {
	// 											id
	// 											name
	// 											email
	// 											role
	// 											permissions
	// 											job
	// 											employeeNum
	// 											department
	// 											token
	// 										}
	// 									`,
	// 								});
	// 								newRefs = [...newRefs, newRef];
	// 							}
	// 						}

	// 						return newRefs;
	// 					},
	// 				},
	// 			});
	// 		} catch (cacheErr) {
	// 			console.warn("⚠️ Cache update skipped:", cacheErr.message);
	// 		}
	// 	},

	// 	onError: (err) => {
	// 		console.error("🚨 Subscription error:", err);
	// 	},
	// });

	// Fuse.js search
	const applyFuse = (list, search) => {
		if (!search) return list;
		const fuse = new Fuse(list, { keys: ["name", "email", "employeeNum", "department"], threshold: 0.4 });
		return fuse.search(search).map((r) => r.item);
	};

	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		setFilteredUsers(applyFuse(users, val));
	};

	const clearSearch = () => {
		setSearchValue("");
		setFilteredUsers(users);
	};

	const getRoleString = (role) => (typeof role === "string" ? role : role?.role || "");

	const canEditUser = (logUser, targetUser) => {
		if (!logUser || !targetUser) return false;

		const logRole = getRoleString(logUser.role);
		const targetRole = getRoleString(targetUser.role);
		const perms = logUser.permissions || {};

		// 1️ Self-edit always comes first
		if (logUser.userId === targetUser.id) return perms.canEditSelf ?? true;

		// 2️ Must have global permission to edit other users
		if (!perms.canEditUsers) return false;

		// 3️Role hierarchy for editing others
		if (logRole === "headAdmin") return !targetUser.permissions?.canNotBeUpdated;
		if (logRole === "admin") return ["subAdmin", "technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeUpdated;
		if (logRole === "subAdmin") return ["technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeUpdated;

		return false;
	};

	const canDeleteUser = (logUser, targetUser) => {
		if (!logUser || !targetUser) return false;

		const logRole = getRoleString(logUser.role);
		const targetRole = getRoleString(targetUser.role);
		const perms = logUser.permissions || {};

		// 1️Self-delete always comes first
		if (logUser.userId === targetUser.id) return perms.canDeleteSelf ?? false;

		// 2 Must have global permission to delete other users
		if (!perms.canDeleteUsers) return false;

		// 3️Role hierarchy for deleting others
		if (logRole === "headAdmin") return !targetUser.permissions?.canNotBeDeleted;
		if (logRole === "admin") return ["subAdmin", "technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeDeleted;
		if (logRole === "subAdmin") return ["technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeDeleted;

		return false;
	};

	return (
		<>
			{loading ? (
				<h1>{t("loading")}</h1>
			) : (
				<div className="list-get-all-content">
					{/* Search */}

					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder={t("search-users-by-name-or-email")} value={searchValue} onChange={handleSearchChange} autoComplete="false" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					<div className="table-wrapper">
						<div className="table-title">
							<h2>{t("users")}</h2>
						</div>
						<table>
							<thead>
								<tr>
									{logUser?.role == "headAdmin" && <th>ID</th>}

									<th>#</th>
									<th>{t("name")}</th>
									<th>{t("email")}</th>
									<th>{t("role")}</th>
									<th>{t("department")}</th>
									<th>{t("action")}</th>
								</tr>
							</thead>

							<tbody>
								{filteredUsers.map((user) => (
									<tr key={user.id}>
										{logUser?.role == "headAdmin" && (
											<td>
												<Link to={`/user/${user?.id}`}>{user?.id}</Link>
											</td>
										)}

										<td>{user.employeeNum ? <Link to={`/user/${user?.id}`}>{user?.employeeNum}</Link> : "N/A"}</td>

										<td>
											<Link to={`/user/${user?.id}`}>{user?.name}</Link>
										</td>
										<td>
											<Link to={`/user/${user?.id}`}>{user?.email}</Link>
										</td>
										<td>{user?.role}</td>

										<td>{user?.department ? user?.department : "N/A"}</td>
										<td>
											{(canEditUser(logUser, user) || canDeleteUser(logUser, user)) && logUser ? (
												<div className="table-action-wrapper">
													{canEditUser(logUser, user) && (
														<Link to={`/admin/user/${user?.id}/update`}>
															<span className="table-action first">{t("update")}</span>
														</Link>
													)}
													{canDeleteUser(logUser, user) && (
														<span
															className="table-action last"
															onClick={() => {
																setSelectedUser(user);
																setIsOpen(true);
															}}>
															{t("delete")}
														</span>
													)}
												</div>
											) : (
												"N/A"
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={selectedUser} />
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}
