import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";

export default function GetAllMaterialRequest() {
	const { error, loading, data, refetch } = useQuery(get_all_material_requests);
	const [mRequests, setMRequests] = useState([]);
	const [logUser, setLogUser] = useState({});

	// const decoded = ;

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			console.log("loading");
		}
		if (data) {
			console.log(data.getAllMaterialRequests);
			setMRequests(data.getAllMaterialRequests);
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

	return (
		<div>
			<h1>Welcome {logUser?.name}</h1>
			<div>
				<Link to={"/user/register"}>register user</Link>
			</div>

			<div>
				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
					Log out
				</Link>
			</div>

			<div>
				<Link to={`/user/all`}>all users</Link>
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
									<th>Requestors Name</th>
									<th>Description</th>
									<th>Amount of items</th>
									{/*<th>Job</th>
									<th>Action</th> */}
								</tr>
							</thead>
							{mRequests.map((request) => {
								return (
									<tbody key={request.id}>
										<tr>
											<td>
												<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
											</td>
											<td>
												<Link to={`/user/${request?.requesterId?.id}`}>{request?.requesterId?.name}</Link>
											</td>
											<td>{request?.description}</td>
											<td>
												{request?.items.map((item) => {
													return (
														<span>
															{item.quantity} - {item.itemName}
															<br />
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
