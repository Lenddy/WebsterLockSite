import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_one_item_group } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation } from "react-router-dom";

export default function AdminGetOneItem() {
	const [item, setItem] = useState([]);
	const [logUser, setLogUser] = useState({});
	const { itemId } = useParams();
	const { error, loading, data, refetch } = useQuery(get_one_item_group, { variables: { id: itemId } });
	// const decoded = ;

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			console.log("loading");
		}
		if (data) {
			console.log(data.getOneItemGroup);
			setItem(data.getOneItemGroup);
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
			{/* <h1>Welcome {logUser?.name}</h1> */}

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
						{item?.itemsList?.map((item) => {
							return (
								<>
									<p key={item.id}>{item.itemName}</p>
									<button> delete</button>
								</>
							);
						})}
					</div>
				</div>
			)}
			{error && <p style={{ color: "red" }}> {error.message}</p>}
		</div>
	);
}
