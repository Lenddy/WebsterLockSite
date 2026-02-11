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

	const {
		error: testError,
		loading: loadingTest,
		data: dataTest,
		refetch: refetchTest,
	} = useQuery(get_all_users, {
		fetchPolicy: "cache-and-network",
	});

	console.log("test data ", dataTest);

	// const [users, setUsers] = useState([]);
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [searchValue, setSearchValue] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);

	// sorting
	const SORT_KEY_STORAGE = "usersTableSortKey";
	const SORT_DIR_STORAGE = "usersTableSortDir";

	const [sortKey, setSortKey] = useState(() => {
		return localStorage.getItem(SORT_KEY_STORAGE) || "name";
	});

	const [sortDir, setSortDir] = useState(() => {
		return localStorage.getItem(SORT_DIR_STORAGE) || "asc";
	});

	useEffect(() => {
		localStorage.setItem(SORT_KEY_STORAGE, sortKey);
		localStorage.setItem(SORT_DIR_STORAGE, sortDir);
	}, [sortKey, sortDir]);

	const sortUsers = (list, key, dir) => {
		return [...list].sort((a, b) => {
			let aVal = a[key];
			let bVal = b[key];

			// Explicit numeric sort for employeeNum
			if (key === "employeeNum") {
				const aNum = Number(aVal);
				const bNum = Number(bVal);

				// Handle missing / invalid numbers safely
				if (Number.isNaN(aNum)) return 1;
				if (Number.isNaN(bNum)) return -1;

				return dir === "asc" ? aNum - bNum : bNum - aNum;
			}

			// Default string sort
			return dir === "asc" ? String(aVal ?? "").localeCompare(String(bVal ?? "")) : String(bVal ?? "").localeCompare(String(aVal ?? ""));
		});
	};

	const handleSort = (key) => {
		if (sortKey === key) {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	};

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
	// !!!!! old
	// useEffect(() => {
	// 	setPageLoading(loading);
	// 	setFilteredUsers(users);

	// 	// if (data) {
	// 	// 	console.log(data.getAllUsers);
	// 	// 	setUsers(data.getAllUsers);
	// 	// 	setFilteredUsers(data.getAllUsers);
	// 	// }

	// 	// data, loading, setPageLoading
	// }, [loading, setPageLoading, users]);

	useEffect(() => {
		setPageLoading(loading);

		const sorted = sortUsers(users, sortKey, sortDir);
		setFilteredUsers(sorted);
	}, [loading, users, sortKey, sortDir, setPageLoading]);

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

		const isSelf = String(logUser.userId) === String(targetUser.id);
		const logRank = roleRank[logUser.role] ?? 0;
		const targetRank = roleRank[targetUser.role] ?? 0;

		//  Self update
		if (isSelf) {
			return can(logUser, "users:update:own", { ownerId: logUser?.userId });
		}

		//  Must have some non-own permission
		const canAny = can(logUser, "users:update:any");
		const canPeer = can(logUser, "peers:update:any", { targetRole: targetUser?.role });

		if (!canAny && !canPeer) return false;

		//  Higher role → allowed with ANY
		if (logRank > targetRank) {
			return canAny;
		}

		//  Same role → PEER required
		if (logRank === targetRank) {
			return canPeer;
		}

		//  Lower role → never
		return false;
	};

	const canDeleteUser = (logUser, targetUser) => {
		if (!logUser || !targetUser) return false;

		const isSelf = String(logUser.userId) === String(targetUser.id);
		const logRank = roleRank[logUser.role] ?? 0;
		const targetRank = roleRank[targetUser.role] ?? 0;

		if (isSelf) {
			return can(logUser, "users:delete:own");
		}

		const canAny = can(logUser, "users:delete:any");
		const canPeer = can(logUser, "peers:update:any", { targetRole: targetUser?.role });
		// const canDelete = can(logUser, "users:delete:any");

		if (!canAny && !canPeer) return false;

		if (logRank > targetRank) return canAny;

		if (logRank === targetRank && !canAny && !canPeer) return canAny && canPeer;

		return false;
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
						<div className="search-filter-wrapper">
							<div className="component-title">
								<h2>{t("users")}</h2>
							</div>

							<div className="search-filter-container">
								<input type="text" className="search-filter-input" placeholder={t("search-users-by-name-or-email")} value={searchValue} onChange={handleSearchChange} autoComplete="false" />
								<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
									✕
								</button>
							</div>
						</div>
					</div>
					<div className="table-wrapper">
						<div className="table-title">{/* <h2>{t("users")}</h2> */}</div>
						<div className="table-scroll">
							<table>
								<thead>
									<tr>
										{logUser?.role == "headAdmin" && <th>ID</th>}

										{/* <th>#</th>
									<th>{t("name")}</th>
									<th>{t("email")}</th> */}

										<th onClick={() => handleSort("employeeNum")} className="clickable-th">
											# {sortKey === "employeeNum" && (sortDir === "asc" ? "▾" : "▴")}
										</th>

										<th onClick={() => handleSort("name")} className="clickable-th">
											{t("name")} {sortKey === "name" && (sortDir === "asc" ? "▾" : "▴")}
										</th>

										<th onClick={() => handleSort("email")} className="clickable-th">
											{t("email")} {sortKey === "email" && (sortDir === "asc" ? "▾" : "▴")}
										</th>

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
												{/* <div className="table-action-wrapper">
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
											</div> */}
												{logUser ? (
													canEditUser(logUser, user) || canDeleteUser(logUser, user) ? (
														<div className="table-action-wrapper">
															{canEditUser(logUser, user) && (
																<Link to={`/admin/user/${user.id}/update`}>
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
													)
												) : (
													"N/A"
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
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
