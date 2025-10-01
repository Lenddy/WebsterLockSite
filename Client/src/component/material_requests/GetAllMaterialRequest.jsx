import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";

export default function GetAllMaterialRequest({ userToken }) {
	const { error, loading, data, refetch } = useQuery(get_all_material_requests);
	const [mRequests, setMRequests] = useState([]);
	const [logUser, setLogUser] = useState({});

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			console.log("loading");
		}
		if (data) {
			console.log(data.getAllMaterialRequests);
			setMRequests(data.getAllMaterialRequests);
			setFilteredMRequests(data.getAllMaterialRequests);
		}
		if (error) {
			console.log("there was an error", error);
		}
		// const fetchData = async () => {
		// 	await refetch();
		// };
		// fetchData();
	}, [loading, data, error]); //refetch

	// // Subscription for live updates
	// useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
	// 	onData: ({ data: subscriptionData }) => {
	// 		console.log("subscription triggered");
	// 		console.log("subscription triggered");
	// 		console.log("subscription triggered");
	// 		const change = subscriptionData?.data?.onMaterialRequestChange;
	// 		console.log("change that happen", change);

	// 		if (!change) return;

	// 		const { eventType, Changes } = change;

	// 		setMRequests((prevRequests) => {
	// 			switch (eventType) {
	// 				case "created":
	// 					console.log("created", [...prevRequests, Changes]);
	// 					return [...prevRequests, Changes];
	// 				case "updated":
	// 					return prevRequests.map((req) => (req.id === Changes.id ? Changes : req));
	// 				case "deleted":
	// 					return prevRequests.filter((req) => req.id !== Changes.id);
	// 				default:
	// 					return prevRequests;
	// 			}
	// 		});
	// 	},
	// 	onError: (err) => console.log("Subscription error:", err),
	// });

	// Subscription for live updates
	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			const change = subscriptionData?.data?.onMaterialRequestChange;
			if (!change) return;

			const { eventType, Changes } = change;

			setMRequests((prevRequests) => {
				let updated;

				if (eventType === "created") {
					updated = [...prevRequests, Changes];
				} else if (eventType === "updated") {
					updated = prevRequests.map((req) => (req.id === Changes.id ? Changes : req));
				} else if (eventType === "deleted") {
					updated = prevRequests.filter((req) => req.id !== Changes.id);
				} else {
					updated = prevRequests;
				}

				// Reapply current filter (just like in users)
				if (searchValue) {
					setFilteredMRequests(applyFuse(updated, searchValue));
				} else {
					setFilteredMRequests(updated);
				}

				return updated;
			});
		},
		onError: (err) => console.log("Subscription error:", err),
	});

	// Fuse.js search function
	const applyFuse = (list, search) => {
		if (!search) return list;

		const fuse = new Fuse(list, {
			keys: ["requester.name", "requester.email"],
			threshold: 0.3,
		});

		return fuse.search(search).map((r) => r.item);
	};

	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		setFilteredMRequests(applyFuse(mRequests, val));
	};

	// Clear search manually
	const clearSearch = () => {
		setSearchValue("");
		setFilteredMRequests(mRequests);
	};

	const [filteredMRequests, setFilteredMRequests] = useState([]);
	const [searchValue, setSearchValue] = useState("");

	return (
		<>
			{loading ? (
				<div>
					{" "}
					<h1>loading...</h1>{" "}
				</div>
			) : (
				<div className="list-get-all-content">
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					<div className="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>ID</th>
									<th>Requestors Name</th>
									<th>Description</th>
									<th>Approval</th>
									<th>Amount of items</th>
									<th>Action</th>
									{/*<th>Job</th>
									<th>Action</th> */}
								</tr>
							</thead>
							<tbody>
								{filteredMRequests.map((request) => {
									return (
										<tr key={request.id}>
											<td>
												<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
											</td>

											<td>
												<Link to={`/material/request/${request?.id}`}>{request?.requester?.name}</Link>
											</td>
											<td>{request?.description}</td>

											<td>
												{" "}
												<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved === true ? "Approved" : "Waiting for approval"}</p>
											</td>

											<td>{request?.items.length}</td>

											<td>
												<div className="table-action-wrapper">
													<Link to={`/material/request/${request.id}/update`}>
														{/* <span className="table-action first">Update</span> */}
														<span className="table-action first">Review</span>
													</Link>

													{/* <span
														className="table-action last"
														onClick={() => {
															
														}}>
														Delete
													</span> */}
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
		</>
	);
}
