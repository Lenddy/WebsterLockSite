import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_all_users } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";

import { USER_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";

import Select from "react-select";

export default function GetAllUsers() {
	const { error, loading, data, refetch } = useQuery(get_all_users);
	const [users, setUsers] = useState([]);
	const [logUser, setLogUser] = useState({});

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			console.log("loading");
		}
		if (data) {
			console.log(data.getAllUsers);
			setUsers(data.getAllUsers);
		}
		if (error) {
			console.log("there was an error", error);
		}
		// const fetchData = async () => {
		// 	await refetch();
		// };
		// fetchData();
	}, [loading, data, error]); //refetch

	// Subscription for live updates
	useSubscription(USER_CHANGE_SUBSCRIPTION, {
		onData: ({ data }) => {
			const change = data?.data?.onUserChange;
			if (!change) return;

			const { eventType, Changes } = change;

			setUsers((prev) => {
				if (eventType === "created") {
					return [...prev, Changes];
				} else if (eventType === "updated") {
					return prev.map((u) => (u.id === Changes.id ? Changes : u));
				} else if (eventType === "deleted") {
					return prev.filter((u) => u.id !== Changes.id);
				}
				return prev;
			});
		},
		onError: (err) => {
			console.error("Subscription error:", err);
		},
	});

	const customFilter = (option, inputValue) => {
		// If search is empty → show all
		if (!inputValue) return true;

		// Fuse.js fuzzy search across labels
		const fuse = new Fuse(allItems, { keys: ["label"], threshold: 0.4 });

		// Keep options that fuzzy-match the search term
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	return (
		<>
			{loading ? (
				<div>
					{" "}
					<h1>loading...</h1>{" "}
				</div>
			) : (
				<div className="list-get-all-content">
					<Select
						// options={brands}
						// value={row.brand}
						// onChange={(val) => handleRowChange(idx, "brand", val)}
						placeholder="Find User"
						isClearable
						isSearchable
						styles={{
							control: (base) => ({
								...base,
								borderRadius: "12px",
								borderColor: "blue",
								width: "500px",
								height: "50px",
							}),
							option: (base, state) => ({
								...base,
								backgroundColor: state.isFocused ? "lightblue" : "white",
								color: "black",
							}),
						}}
					/>
					<table className="table-container">
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
						{users.map((user) => {
							return (
								<tbody key={user.id}>
									<tr>
										<td>
											<Link to={`/user/${user?.id}`}>{user?.id}</Link>
										</td>
										<td>
											<Link to={`/user/${user?.id}`}>{user?.name}</Link>
										</td>
										<td>{user?.email}</td>
										<td>{user?.role}</td>
										<td>{user?.job?.title}</td>
										<td>
											<div>
												<button>Update</button>
												<button>Delete</button>
											</div>
										</td>
									</tr>
								</tbody>
							);
						})}
					</table>
				</div>
			)}
			{error && <p style={{ color: "red" }}> {error.message}</p>}
		</>
	);
}
