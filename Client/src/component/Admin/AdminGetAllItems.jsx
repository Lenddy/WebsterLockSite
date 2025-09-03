import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";

export default function AdminGetAllItems() {
	const { error, loading, data, refetch } = useQuery(get_all_item_groups);
	const [items, setItems] = useState([]);
	const [logUser, setLogUser] = useState({});

	// const decoded = ;

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			console.log("loading");
		}
		if (data) {
			console.log(data.getAllItemGroups);
			setItems(data.getAllItemGroups);
		}
		if (error) {
			console.log("there was an error", error);
		}
		// const fetchData = async () => {
		// 	await refetch();
		// };
		// fetchData();
	}, [loading, data, error]); //refetch
	// // Subscription for client changes
	// 	useSubscription(CLIENT_CHANGE_SUBSCRIPTION, {
	// 		onError: err => console.log("this is the error from subscription", err),
	// 		onData: infoChange => {
	// 			// console.log("this the subscription :", infoChange);
	// 			const changeClient = infoChange?.data?.data?.onClientChange;
	// 			const { eventType, clientChanges } = changeClient;
	// 			// console.log("New data from subscription:", changeClient);
	// 			if (eventType === "CLIENT_ADDED") {
	// 				// Handle new client addition
	// 				setClients(prevClients => [...prevClients, clientChanges]);
	// 			} else if (eventType === "CLIENT_UPDATED") {
	// 				// Handle client update
	// 				setClients(prevClients => prevClients.map(c => (c.id === clientChanges.id ? clientChanges : c)));
	// 			} else if (eventType === "CLIENT_DELETED") {
	// 				// Handle client deletion
	// 				setClients(prevClients => prevClients.filter(c => c.id !== clientChanges.id));
	// 			}
	// 		},
	// 		onComplete: complete => console.log("subscription completed", complete),

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
				<Link to={"/user/register"}>register user</Link>
			</div>

			<div>
				<Link to={`/material/request/all`}>all material requests</Link>
			</div>
			{/* {/*  */}
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
									<th>Brand</th>
									<th>Item amount</th>
									<th>Some items</th>
								</tr>
							</thead>
							{items.flatMap((ig) => {
								return (
									<tbody key={ig.id}>
										<tr>
											<td>
												<Link to={`/admin/material/item/${ig?.id}`}>{ig?.id}</Link>
											</td>
											<td>
												<Link to={`/admin/material/item/${ig?.id}`}>{ig?.brand}</Link>
											</td>
											<td>{ig?.itemsList?.length}</td>
											<td>
												{ig?.itemsList?.slice(0, 3).map((item, idx, arr) => {
													return (
														<span key={item.id}>
															{item.itemName}
															{idx < arr.length - 1 ? ", " : ""}
														</span>
													);
												})}
											</td>
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
