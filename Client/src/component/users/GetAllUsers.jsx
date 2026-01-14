import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_users } from "../../../graphQL/queries/queries";
import { Link, useNavigate } from "react-router-dom";
import { USER_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext"; // <-- use context here
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useUsers } from "../../context/UsersContext";
// import { needReload } from "../../../graphQL/apolloClient";
import { can } from "../../../../Server/isAdmin";
import { roleRank } from "../utilities/role.config";

export default function GetAllUsers() {
	const { userToken, setPageLoading } = useAuth(); // Get current user token from context
	const [logUser, setLogUser] = useState(null);

	const { users, loading, error } = useUsers();

	// console.log("does the page needs a reload ? ", needReload);

	// const { error, loading, data, refetch } = useQuery(get_all_users, {
	// 	fetchPolicy: "cache-and-network",
	// });
	// const [users, setUsers] = useState([]);
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [searchValue, setSearchValue] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);

	const { t } = useTranslation();
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
			navigate("/material/request/all", { replace: true });
		}
	}, [canUserReview, navigate]);

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
	}, [loading, setPageLoading, users]);

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

	// const canEditUser = (logUser, targetUser) => {
	// 	if (!logUser || !targetUser) return false;

	// 	const logRole = getRoleString(logUser.role);
	// 	const targetRole = getRoleString(targetUser.role);
	// 	const perms = logUser.permissions || [];
	// 	console.log("perms", perms);
	// 	can(logUser, "users:update:any", logUser.userId);
	// 	can(logUser, "users:update:any");
	// 	// 1️ Self-edit always comes first
	// 	if (logUser.userId === targetUser.id) return perms.canEditSelf ?? true;

	// 	// 2️ Must have global permission to edit other users
	// 	if (!perms.canEditUsers) return false;

	// 	// 3️Role hierarchy for editing others
	// 	if (logRole === "headAdmin") return !targetUser.permissions?.canNotBeUpdated;
	// 	if (logRole === "admin") return ["subAdmin", "technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeUpdated;
	// 	if (logRole === "subAdmin") return ["technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeUpdated;

	// 	return false;
	// };

	// export

	const canEditUser = (logUser, targetUser) => {
		if (!logUser || !targetUser) return false;

		const isSelf = String(logUser.userId) === String(targetUser.id);

		// --------------------
		// Self update
		// --------------------
		if (isSelf) {
			return can(logUser, "users:update:own", { ownerId: targetUser.id });
		}

		// --------------------
		// Update others
		// --------------------
		if (!can(logUser, "users:update:any")) {
			return false;
		}

		// --------------------
		// Role hierarchy
		// --------------------
		const logRank = roleRank[logUser.role] ?? 0;
		const targetRank = roleRank[targetUser.role] ?? 0;

		if (logRank <= targetRank) {
			return false;
		}

		return true;
	};

	// const canDeleteUser = (logUser, targetUser) => {
	// 	if (!logUser || !targetUser) return false;

	// 	const logRole = getRoleString(logUser.role);
	// 	const targetRole = getRoleString(targetUser.role);
	// 	const perms = logUser.permissions || {};

	// 	// 1️Self-delete always comes first
	// 	if (logUser.userId === targetUser.id) return perms.canDeleteSelf ?? false;

	// 	// 2 Must have global permission to delete other users
	// 	if (!perms.canDeleteUsers) return false;

	// 	// 3️Role hierarchy for deleting others
	// 	if (logRole === "headAdmin") return !targetUser.permissions?.canNotBeDeleted;
	// 	if (logRole === "admin") return ["subAdmin", "technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeDeleted;
	// 	if (logRole === "subAdmin") return ["technician", "user", "noRole"].includes(targetRole) && !targetUser.permissions?.canNotBeDeleted;

	// 	return false;
	// };

	// export
	const canDeleteUser = (logUser, targetUser) => {
		if (!logUser || !targetUser) return false;

		const isSelf = String(logUser.userId) === String(targetUser.id);

		// --------------------
		// Self delete
		// --------------------
		if (isSelf) {
			return can(logUser, "users:delete:own", { ownerId: targetUser.id });
		}

		// --------------------
		// Delete others
		// --------------------
		if (!can(logUser, "users:delete:any")) {
			return false;
		}

		// --------------------
		// Role hierarchy
		// --------------------
		const logRank = roleRank[logUser.role] ?? 0;
		const targetRank = roleRank[targetUser.role] ?? 0;

		if (logRank <= targetRank) {
			return false;
		}

		return true;
	};

	const closeModal = () => {
		setIsOpen(false);
		setSelectedUser(null);
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
					{/*  onClose={() => setIsOpen(false)} */}
					{/* //NOTE - i lost connection to then subs when i use the new code to close the modal after deletion  if i go back tot he old code it works normaly but the modal does not close  so figure out how to close the modal with out  breaking the subs  */}
					{/* <Modal isOpen={isOpen} onClose={closeModal} data={selectedUser} setIsOpen={setIsOpen} /> */}
					<Modal isOpen={isOpen} onClose={closeModal} data={selectedUser} setIsOpen={setIsOpen} setSelectedUser={setSelectedUser} />
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}
