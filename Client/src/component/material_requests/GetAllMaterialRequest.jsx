import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";

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

	// Subscription for live updates
	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			const change = subscriptionData?.data?.onMaterialRequestChange;
			if (!change) return;

			const { eventType, Changes } = change;

			setMRequests((prevRequests) => {
				switch (eventType) {
					case "created":
						return [...prevRequests, Changes];
					case "updated":
						return prevRequests.map((req) => (req.id === Changes.id ? Changes : req));
					case "deleted":
						return prevRequests.filter((req) => req.id !== Changes.id);
					default:
						return prevRequests;
				}
			});
		},
		onError: (err) => console.log("Subscription error:", err),
	});

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

			<div>
				<Link to={`/material/request/request`}>Request Material</Link>
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
							<tbody>
								{mRequests.map((request) => {
									return (
										<tr key={request.id}>
											<td>
												<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
											</td>
											<td>
												<Link to={`/user/${request?.requester?.id}`}>{request?.requester?.name}</Link>
											</td>
											<td>{request?.description}</td>
											<td>
												{request?.items.map((item) => {
													return (
														<span key={item.id}>
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
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
			{error && <p style={{ color: "red" }}> {error.message}</p>}
		</div>
	);
}
