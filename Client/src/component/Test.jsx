import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { get_all_material_requests } from "../../graphQL/queries/queries";
import { Link } from "react-router-dom";

function ApiTest() {
	const { error, loading, data, refetch } = useQuery(get_all_material_requests);
	const [users, setUsers] = useState([]);

	useEffect(() => {
		if (loading) {
			console.log("loading");
		}
		if (data) {
			console.log(data);
			setUsers(data);
		}
		if (error) {
			console.log("there was an error", error);
		}
		const fetchData = async () => {
			await refetch();
		};
		fetchData();
	}, [loading, data, error, refetch]);
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
			<h1>.env variable: {import.meta.env.VITE_API_URL}</h1>

			<h2>GraphQL API Test</h2>
			{data && <p style={{ color: "green" }}>✅ data</p>}
			{error && <p style={{ color: "red" }}>❌ error</p>}

			<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
				{" "}
				Log in page
			</Link>
		</div>
	);
}

export default ApiTest;
