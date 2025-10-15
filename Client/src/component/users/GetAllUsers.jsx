import { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_users } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { USER_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext"; // <-- use context here
import { jwtDecode } from "jwt-decode";

export default function GetAllUsers() {
	const { userToken } = useAuth(); // Get current user token from context
	const [logUser, setLogUser] = useState(null);

	const { error, loading, data } = useQuery(get_all_users);
	const [users, setUsers] = useState([]);
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [searchValue, setSearchValue] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);

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
		if (data) {
			setUsers(data.getAllUsers);
			setFilteredUsers(data.getAllUsers);
		}
	}, [data]);

	// Live subscription for updates
	useSubscription(USER_CHANGE_SUBSCRIPTION, {
		onData: ({ data }) => {
			const change = data?.data?.onUserChange;
			if (!change) return;

			const { eventType, Changes } = change;
			setUsers((prev) => {
				let updated;
				if (eventType === "created") updated = [...prev, Changes];
				else if (eventType === "updated") updated = prev.map((u) => (u.id === Changes.id ? Changes : u));
				else if (eventType === "deleted") updated = prev.filter((u) => u.id !== Changes.id);
				else updated = prev;

				if (searchValue) setFilteredUsers(applyFuse(updated, searchValue));
				else setFilteredUsers(updated);

				return updated;
			});
		},
	});

	// Fuse.js search
	const applyFuse = (list, search) => {
		if (!search) return list;
		const fuse = new Fuse(list, { keys: ["name", "email"], threshold: 0.4 });
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
				<h1>Loading...</h1>
			) : (
				<div className="list-get-all-content">
					{/* Search */}
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					<div className="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>ID</th>
									<th>Name</th>
									<th>Email</th>
									<th>Role</th>
									<th>Job</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredUsers.map((user) => (
									<tr key={user.id}>
										<td>
											<Link to={`/user/${user.id}`}>{user.id}</Link>
										</td>
										<td>
											<Link to={`/user/${user.id}`}>{user.name}</Link>
										</td>
										<td>
											<Link to={`/user/${user.id}`}>{user.email}</Link>
										</td>
										<td>{user.role}</td>
										<td>{user.job?.title ?? "N/A"}</td>
										<td>
											{(canEditUser(logUser, user) || canDeleteUser(logUser, user)) && logUser ? (
												<div className="table-action-wrapper">
													{canEditUser(logUser, user) && (
														<Link to={`/admin/user/${user.id}/update`}>
															<span className="table-action first">Update</span>
														</Link>
													)}
													{canDeleteUser(logUser, user) && (
														<span
															className="table-action last"
															onClick={() => {
																setSelectedUser(user);
																setIsOpen(true);
															}}>
															Delete
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
