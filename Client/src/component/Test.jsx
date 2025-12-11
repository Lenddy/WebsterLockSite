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

	// useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
	// 	onData: ({ data: subscriptionData, client }) => {
	// 		console.log("📡 Subscription raw data:", subscriptionData);

	// 		const changeEvent = subscriptionData?.data?.onMaterialRequestChange;
	// 		console.log("before the return ");
	// 		console.log("this is the change event", changeEvent);
	// 		if (!changeEvent) return;
	// 		console.log("after the return ");

	// 		// const { eventType, changeType, change: singleChange, changes: multipleChanges } = changeEvent;
	// 		const { eventType, changeType, change, changes } = changeEvent;
	// 		console.warn("this is event type", eventType);
	// 		console.warn("this is change type", changeType);
	// 		console.warn("this is singe change", change);
	// 		console.warn("this is multiple changes", changes);
	// 		// Normalize into an array — so downstream logic doesn’t have to care
	// 		const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

	// 		console.log("this is normalize", changesArray);

	// 		console.warn("before the check of of change array length");
	// 		if (!changesArray.length) return;
	// 		console.warn("after the check of of change array length");

	// 		console.log(`📡 Material Request subscription event: ${eventType}, changeType: ${changeType}, count: ${changesArray.length}`);

	// 		// --- Update state ---
	// 		setMRequests((prevRequests) => {
	// 			let updated = [...prevRequests];

	// 			for (const Changes of changesArray) {
	// 				if (eventType === "created") {
	// 					const exists = prevRequests.some((r) => r.id === Changes.id);
	// 					if (!exists) {
	// 						updated = [...updated, Changes];
	// 					}
	// 				} else if (eventType === "updated") {
	// 					updated = updated.map((req) => {
	// 						if (req.id !== Changes.id) return req;

	// 						const existingItems = req.items || [];
	// 						const updatedItems = (Changes.items || []).map((newItem) => {
	// 							const index = existingItems.findIndex((i) => i.id === newItem.id);
	// 							if (index > -1) return { ...existingItems[index], ...newItem };
	// 							return newItem;
	// 						});

	// 						const remainingItems = existingItems.filter((i) => !updatedItems.some((u) => u.id === i.id));

	// 						return { ...req, items: [...remainingItems, ...updatedItems], ...Changes };
	// 					});
	// 				} else if (eventType === "deleted") {
	// 					updated = updated.filter((req) => req.id !== Changes.id);
	// 				}
	// 			}

	// 			return updated;
	// 		});

	// 		// --- Update Apollo Cache ---
	// 		try {
	// 			client.cache.modify({
	// 				fields: {
	// 					getAllMaterialRequests(existingRefs = [], { readField }) {
	// 						let newRefs = [...existingRefs];

	// 						for (const Changes of changesArray) {
	// 							if (eventType === "deleted") {
	// 								newRefs = newRefs.filter((ref) => readField("id", ref) !== Changes.id);
	// 								continue;
	// 							}

	// 							const existingIndex = newRefs.findIndex((ref) => readField("id", ref) === Changes.id);

	// 							if (existingIndex > -1 && eventType === "updated") {
	// 								newRefs = newRefs.map((ref) =>
	// 									readField("id", ref) === Changes.id
	// 										? client.cache.writeFragment({
	// 												data: Changes,
	// 												fragment: gql`
	// 													fragment UpdatedMaterialRequest on MaterialRequest {
	// 														id
	// 														items {
	// 															id
	// 															itemName
	// 															quantity
	// 															itemDescription
	// 															color
	// 															side
	// 															size
	// 														}
	// 														requester {
	// 															userId
	// 															name
	// 															email
	// 														}
	// 														reviewers {
	// 															userId
	// 															email
	// 															name
	// 															comment
	// 															reviewedAt
	// 														}
	// 														approvalStatus {
	// 															approvedBy {
	// 																userId
	// 																name
	// 																email
	// 															}
	// 														}
	// 													}
	// 												`,
	// 										  })
	// 										: ref
	// 								);
	// 							} else if (eventType === "created") {
	// 								const newRef = client.cache.writeFragment({
	// 									data: Changes,
	// 									fragment: gql`
	// 										fragment NewMaterialRequest on MaterialRequest {
	// 											id
	// 											items {
	// 												id
	// 												itemName
	// 												quantity
	// 												itemDescription
	// 												color
	// 												side
	// 												size
	// 											}
	// 											requester {
	// 												userId
	// 												name
	// 												email
	// 											}
	// 											reviewers {
	// 												userId
	// 												email
	// 												name
	// 												comment
	// 												reviewedAt
	// 											}
	// 											approvalStatus {
	// 												approvedBy {
	// 													userId
	// 													name
	// 													email
	// 												}
	// 											}
	// 										}
	// 									`,
	// 								});
	// 								newRefs = [...newRefs, newRef];
	// 							}
	// 						}

	// 						return newRefs;
	// 					},
	// 				},
	// 			});
	// 		} catch (cacheErr) {
	// 			console.warn("⚠️ Cache update skipped:", cacheErr.message);
	// 		}
	// 	},

	// 	onError: (err) => {
	// 		console.error("🚨 Subscription error:", err);
	// 	},
	// });

	return (
		<div>
			<h1>.env variable: {import.meta.env.VITE_API_URL}</h1>

			<h2>GraphQL API Test</h2>
			{data && <p style={{ color: "green" }}>✅ data</p>}
			{error && <p style={{ color: "red" }}>❌ error</p>}

			<Link
				to={"/"}
				// onClick={() => localStorage.removeItem("userToken")}
			>
				{" "}
				Log in page
			</Link>
		</div>
	);
}

export default ApiTest;
