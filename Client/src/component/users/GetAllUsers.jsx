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

	const canEditUser = (logUser, targetUser) => {
		//TODO you change peer permission so make it works

		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", targetUser, "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		// const targetRole = targetUser.role;
		// console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", targetUser.role, "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		// console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", logUser, "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		// console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", targetUser, "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		console.log("check 0");

		if (!logUser || !targetUser) return false;

		// console.log("logUser:", logUser, "targetUser:", targetUser);

		console.log("check 1");
		const isSelf = String(logUser.userId) === String(targetUser.id);
		console.log("check 2");
		// --------------------
		// Self update
		// --------------------
		if (isSelf) {
			return can(logUser, "users:update:own", { ownerId: targetUser.id });
		}

		console.log("check 3");
		// --------------------
		// Must have at least ONE update permission
		// --------------------{ targetRole: targetUser.role }
		const canAny = can(logUser, "users:update:any");
		// const canPeer = can(logUser, "users:update:peer", { targetRole: targetUser.role });
		const canPeer = can(logUser, "users:update:any:peer", { targetRole: targetUser.role });
		// const canPeer = can(logUser, "users:update:peer");
		// const canPeer = true;

		console.log("this is the can use peer", canPeer);
		console.log("check 4");
		// !canAny &&
		if (!canAny && !canPeer) {
			return false;
		}

		console.log("check 5");
		// --------------------
		// Role hierarchy
		// --------------------
		const logRank = roleRank[logUser.role] ?? 0;
		console.log("logRank", logRank);

		const targetRank = roleRank[targetUser.role] ?? 0;
		console.log("targetRank", targetRank);
		// Higher role → allowed
		if (logRank > targetRank) return true;

		console.log("check 6");
		// Same role → requires peer permission
		if (logRank === targetRank) {
			return canPeer;
		}

		console.log("check 7");

		// Lower role trying to update higher

		return false;
	};

	// const canEditUser = (logUser, targetUser) => {
	// 	if (!logUser || !targetUser) return false;

	// 	const isSelf = String(logUser.userId) === String(targetUser.id);

	// 	if (isSelf) {
	// 		return can(logUser, "users:update:own", { ownerId: targetUser.id });
	// 	}

	// 	const canAny = can(logUser, "users:update:any");
	// 	const canPeer = can(logUser, "users:update:peer");

	// 	if (!canAny && !canPeer) return false;

	// 	const logRank = roleRank[logUser.role] ?? 0;
	// 	const targetRank = roleRank[targetUser.role] ?? 0;

	// 	// higher role always allowed
	// 	if (logRank > targetRank) return true;

	// 	// same role → peer required
	// 	if (logRank === targetRank) return canPeer;

	// 	// lower role editing higher → never
	// 	return false;
	// };

	// const canDeleteUser = (logUser, targetUser) => {
	// 	if (!logUser || !targetUser) return false;

	// 	const isSelf = String(logUser.userId) === String(targetUser.id);

	// 	// --------------------
	// 	// Self delete
	// 	// --------------------
	// 	if (isSelf) {
	// 		return can(logUser, "users:delete:own", { ownerId: targetUser.id });
	// 	}

	// 	const canAny = can(logUser, "users:delete:any");
	// 	const canPeer = can(logUser, "users:delete:peer", { targetRole: targetUser.role });

	// 	if (!canAny && !canPeer) {
	// 		return false;
	// 	}

	// 	const logRank = roleRank[logUser.role] ?? 0;
	// 	console.log("logRank", logRank);
	// 	const targetRank = roleRank[targetUser.role] ?? 0;
	// 	console.log("targetRank", targetRank);

	// 	if (logRank > targetRank) return true;

	// 	if (logRank === targetRank) {
	// 		return canPeer;
	// 	}

	// 	return false;
	// };

	// const canDeleteUser = (logUser, targetUser) => {
	// 	if (!logUser || !targetUser) return false;

	// 	const isSelf = String(logUser.userId) === String(targetUser.id);

	// 	// --------------------
	// 	// Self delete
	// 	// --------------------
	// 	if (isSelf) {
	// 		return can(logUser, "users:delete:own", { ownerId: targetUser.id });
	// 	}

	// 	// --------------------
	// 	// Delete others
	// 	// --------------------
	// 	if (!can(logUser, "users:delete:any")) {
	// 		return false;
	// 	}

	// 	// --------------------
	// 	// Role hierarchy
	// 	// --------------------
	// 	const logRank = roleRank[logUser.role] ?? 0;
	// 	const targetRank = roleRank[targetUser.role] ?? 0;

	// 	if (logRank <= targetRank && !can(logUser, "users:update:peer")) {
	// 		return false;
	// 	}

	// 	return true;
	// };

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

											{
												// (
												canEditUser(logUser, user) &&
												// || canDeleteUser(logUser, user))

												logUser ? (
													<div className="table-action-wrapper">
														{canEditUser(logUser, user) && (
															<Link to={`/admin/user/${user?.id}/update`}>
																<span className="table-action first">{t("update")}</span>
															</Link>
														)}
														{/* {canDeleteUser(logUser, user) && (
														<span
															className="table-action last"
															onClick={() => {
																setSelectedUser(user);
																setIsOpen(true);
															}}>
															{t("delete")}
														</span>
													)} */}
													</div>
												) : (
													"N/A"
												)
											}
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
