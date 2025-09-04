import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_all_users } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";

import { USER_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";

export default function GetAllUsers() {
	const { error, loading, data, refetch } = useQuery(get_all_users);
	const [users, setUsers] = useState([]);
	const [logUser, setLogUser] = useState({});

	// const decoded = ;

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

	{
		/* 
			<div>
				<a href={"/user/admin/register"}> a tag register </a>
			</div> */
	}

	return (
		<div>
			<h1>Welcome {logUser?.name}</h1>

			<div>
				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
					Log out
				</Link>
			</div>

			<div>
				<Link to={"/admin/user/register"}>admin register users</Link>
			</div>

			<div>
				<Link to={"/admin/user/update"}>admin update users</Link>
			</div>

			<div>
				<Link to={"/admin/material/request/"}>admin create material requests</Link>
			</div>

			<div>
				<Link to={"/admin/material/request/"}>admin create material requests</Link>
			</div>
			<div>
				<Link to={"/admin/material/item/all"}>all items</Link>
			</div>

			<div>
				<Link to={"/admin/material/item/create"}>admin create items</Link>
			</div>

			<div>
				<Link to={"/admin/material/item/update"}>admin update items</Link>
			</div>

			<div>
				<Link to={"/user/register"}>register user</Link>
			</div>

			<div>
				<Link to={`/material/request/all`}>all material requests</Link>
			</div>

			{loading ? (
				<div>
					{" "}
					<h1>loading...</h1>{" "}
				</div>
			) : (
				<div>
					<div>
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
				</div>
			)}
			{error && <p style={{ color: "red" }}> {error.message}</p>}
		</div>
	);
}
