import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_one_user } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation } from "react-router-dom";
import UpdateOneUser from "./updateOneUser";

import DeleteOneUser from "./DeleteOneUser";

export default function GetOneUser() {
	const [user, setUser] = useState({});
	const [logUser, setLogUser] = useState({});
	const { userId } = useParams();

	const location = useLocation();
	const currentRoutePath = location.pathname;
	// console.log(currentRoutePath);
	const { error, loading, data, refetch } = useQuery(get_one_user, { variables: { id: userId } });

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			// console.log("loading");
		}
		if (data) {
			// console.log(data.getOneUser);
			setUser(data.getOneUser);
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
				<Link to={`/user/${userId}/update`}>update users</Link>
			</div>

			<div>
				<Link to={`/user/${userId}/update/admin`}>admin update users</Link>
			</div>

			{currentRoutePath === `/user/${userId}/update` ? (
				<UpdateOneUser userId={userId} user={user} />
			) : loading ? (
				<div>
					<h1>loading...</h1>
				</div>
			) : (
				<div>
					<div>
						<p>name: {user.name}</p>
						<p>email:{user.email}</p>
						<p>Role: {user.role}</p>
						<p>job: {user?.job?.title === null || user?.job?.title === undefined ? "no job available" : user?.job?.title}</p>
					</div>

					<DeleteOneUser userId={userId} />
				</div>
			)}

			{/* {error && <p style={{ color: "red" }}> {error.message}</p>} */}
			{/* <h1>hello: {userId}</h1> */}
		</div>
	);
}
