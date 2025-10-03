import { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { get_all_users } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { USER_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import Modal from "../Modal";

export default function GetAllUsers({ userToken }) {
	const { error, loading, data } = useQuery(get_all_users);
	const [users, setUsers] = useState([]);
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [searchValue, setSearchValue] = useState(""); // persistent search
	// const [logUser, setLogUser] = useState({});
	console.log("this is the filter users", filteredUsers);

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

				// Reapply current filter
				if (searchValue) setFilteredUsers(applyFuse(updated, searchValue));
				else setFilteredUsers(updated);

				return updated;
			});
		},
	});

	// Fuse.js search function
	const applyFuse = (list, search) => {
		if (!search) return list;

		const fuse = new Fuse(list, {
			keys: ["name", "email"],
			threshold: 0.4,
		});

		return fuse.search(search).map((r) => r.item);
	};

	// Handle input change
	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		setFilteredUsers(applyFuse(users, val));
	};

	// Clear search manually
	const clearSearch = () => {
		setSearchValue("");
		setFilteredUsers(users);
	};

	const [isOpen, setIsOpen] = useState(false);

	const [selectedUser, setSelectedUser] = useState(null);

	return (
		<>
			{loading ? (
				<h1>Loading...</h1>
			) : (
				<div className="list-get-all-content">
					{/* Neutral search input */}
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
							<button
								className="search-clear-btn"
								onClick={clearSearch}
								disabled={!searchValue} // disabled when input is empty
							>
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
											{(jwtDecode(localStorage.getItem("UserToken")).role === "headAdmin" ? jwtDecode(localStorage.getItem("UserToken")).id !== user.id : jwtDecode(localStorage.getItem("UserToken")).role === "admin" ? ["subAdmin", "user", "noRole"].includes(user.role) : jwtDecode(localStorage.getItem("UserToken")).role === "subAdmin" ? ["user", "noRole"].includes(user.role) : false) ? (
												<div className="table-action-wrapper">
													<Link to={`/admin/user/${user.id}/update`}>
														<span className="table-action first">Update</span>
													</Link>
													<span
														className="table-action last"
														onClick={() => {
															setSelectedUser(user);
															setIsOpen(true);
														}}>
														Delete
													</span>
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

					<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={selectedUser} userToken={userToken} />
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}
