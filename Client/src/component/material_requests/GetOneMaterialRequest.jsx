import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_one_material_request } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation, Navigate, useNavigate } from "react-router-dom";
import UpdateOneMaterialRequest from "./UpdateOneMaterialRequest";
// import UpdateOneUser from "./updateOneUser";
// import AdminUpdateOneUser from "./AdminUpdateOneUser";

export default function GetOneMaterialRequest() {
	const [mRequest, setMRequest] = useState({});
	const [logUser, setLogUser] = useState({});
	const { requestId } = useParams();
	// const navigate = useNavigate()

	// const location = useLocation();
	// const currentRoutePath = location.pathname;

	const location = useLocation();
	const currentRoutePath = location.pathname;

	const { error, loading, data, refetch } = useQuery(get_one_material_request, { variables: { id: requestId } });

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			// console.log("loading");
		}
		if (data) {
			console.log(data.getOneMaterialRequest);
			setMRequest(data.getOneMaterialRequest);
		}
		if (error) {
			// console.log("there was an error", error);
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
			{/* <div>
				<Link to={`/user/${userId}/update/admin`}>admin update users</Link>
			</div> */}

			{
				// currentRoutePath === `/user/${userId}/update/admin` ? (
				// 	<AdminUpdateOneUser userId={userId} user={user} />
				// ) : currentRoutePath === `/user/${userId}/update` ? (
				// 	<UpdateOneUser userId={userId} user={user} />
				// ) :

				currentRoutePath === `/material/request/${requestId}/update` ? (
					<UpdateOneMaterialRequest requestId={requestId} />
				) : loading ? (
					<div>
						<h1>loading...</h1>
					</div>
				) : (
					<div>
						<h1>Welcome {logUser?.name}</h1>
						<div>
							<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
								Log out
							</Link>
						</div>

						<div>
							<Link to={"/user/all"}>all users</Link>
						</div>

						<div>
							<Link to={"/material/request/all"}>all Material Requests</Link>
						</div>
						<div>
							<Link to={`/material/request/${requestId}/update`}>update request</Link>
						</div>
						{/* this might need to change later */}
						<div>
							<p>ID: {mRequest?.id}</p>
							<p>requested Date: {mRequest.addedDate ? new Date(Number(mRequest?.addedDate)).toLocaleString() : "N/A"}</p>
							<p>name: {mRequest?.requester?.name}</p>
							<p>
								Items:{" "}
								{mRequest?.items?.map((item) => {
									return (
										<span key={item?.id}>
											{item.quantity} - {item.itemName}{" "}
											<p>
												/ Item description <span>{item.itemDescription}</span>{" "}
											</p>
											<br />
										</span>
									);
								})}
							</p>
							<p>description: {mRequest?.description}</p>

							<p>
								review by:{" "}
								{mRequest?.reviewers?.length < 0
									? "no review has been done yet"
									: mRequest?.reviewers?.map((rv) => {
											return (
												<span key={rv?.userId}>
													{rv?.name} <br />
												</span>
											);
									  })}
							</p>
						</div>
					</div>
				)
			}

			{error && <p style={{ color: "red" }}> {error.message}</p>}
			{/* <h1>hello: {requestId}</h1> */}
		</div>
	);
}
