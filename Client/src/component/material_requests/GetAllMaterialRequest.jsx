import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import { gql } from "@apollo/client";
// import client from "../../../graphQL/apolloClient";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";

export default function GetAllMaterialRequest() {
	const { userToken } = useAuth();
	const { error, loading, data } = useQuery(get_all_material_requests, { fetchPolicy: "cache-and-network" });

	const [mRequests, setMRequests] = useState([]);
	// const [filteredMRequests, setFilteredMRequests] = useState([]);
	const [searchValue, setSearchValue] = useState("");

	// Fetch and set requests
	useEffect(() => {
		if (data?.getAllMaterialRequests) {
			console.log("requests", data?.getAllMaterialRequests);
			setMRequests(data.getAllMaterialRequests);
			// setFilteredMRequests(searchAndSort(data.getAllMaterialRequests));
		}
	}, [data]);

	// QuickSort: approval first (waiting = 0, approved = 1), then date descending
	const quickSortRequests = (arr) => {
		if (arr.length <= 1) return arr;

		const pivot = arr[arr.length - 1];
		const left = [];
		const right = [];

		for (let i = 0; i < arr.length - 1; i++) {
			const aApproved = arr[i]?.approvalStatus?.isApproved ? 1 : 0;
			const pivotApproved = pivot?.approvalStatus?.isApproved ? 1 : 0;

			if (aApproved < pivotApproved) {
				left.push(arr[i]);
			} else if (aApproved > pivotApproved) {
				right.push(arr[i]);
			} else {
				// Same approval → sort by date descending
				if (dayjs(arr[i].addedDate).valueOf() > dayjs(pivot.addedDate).valueOf()) {
					left.push(arr[i]);
				} else {
					right.push(arr[i]);
				}
			}
		}

		return [...quickSortRequests(left), pivot, ...quickSortRequests(right)];
	};

	// Fuse.js search
	const applyFuse = (list, search) => {
		if (!search) return list;
		const fuse = new Fuse(list, { keys: ["requester.name", "requester.email", "requester.employeeNum", "requester.department"], threshold: 0.4 });
		return fuse.search(search).map((r) => r.item);
	};

	// Combine search + sorting
	const searchAndSort = (list, search = "") => {
		const filtered = search ? applyFuse(list, search) : list;
		return quickSortRequests(filtered);
	};

	const filteredMRequests = React.useMemo(() => searchAndSort(mRequests, searchValue), [mRequests, searchValue]);

	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData, client }) => {
			const change = subscriptionData?.data?.onMaterialRequestChange;
			if (!change) return;

			const { eventType, Changes } = change;
			console.log("📡 Material Request subscription event:", eventType, Changes);

			//  Update local React state
			setMRequests((prevRequests) => {
				let updated = [...prevRequests];

				if (eventType === "created") {
					// Add new item only if it doesn't already exist
					const exists = prevRequests.some((r) => r.id === Changes.id);
					if (!exists) {
						updated = [...prevRequests, Changes];
					}
				}
				//  else if (eventType === "updated") {
				// 	updated = prevRequests.map((req) => (req.id === Changes.id ? { ...req, ...Changes } : req));
				// }
				else if (eventType === "updated") {
					updated = prevRequests.map((req) => {
						if (req.id !== Changes.id) return req;

						const existingItems = req.items || [];
						const updatedItems = (Changes.items || []).map((newItem) => {
							const index = existingItems.findIndex((i) => i.id === newItem.id);
							if (index > -1) return { ...existingItems[index], ...newItem }; // update
							return newItem; // add
						});

						// Remove items that are not in Changes.items (deleted)
						const remainingItems = existingItems.filter((i) => !updatedItems.some((u) => u.id === i.id));

						return { ...req, items: [...remainingItems, ...updatedItems], ...Changes };
					});
				} else if (eventType === "deleted") {
					updated = prevRequests.filter((req) => req.id !== Changes.id);
				}

				//  Keep filtered list in sync
				// setFilteredMRequests(searchAndSort(updated, searchValue));
				return updated;
			});

			//  OPTIONAL — Sync Apollo Cache
			try {
				console.log("on the view all ", client.cache.extract());
				client.cache.modify({
					fields: {
						getAllMaterialRequests(existingRefs = [], { readField }) {
							if (eventType === "deleted") {
								// 🗑 Remove from cache
								return existingRefs.filter((ref) => readField("id", ref) !== Changes.id);
							}

							// Find if the entry already exists
							const existingIndex = existingRefs.findIndex((ref) => readField("id", ref) === Changes.id);

							if (existingIndex > -1 && eventType === "updated") {
								//  Update existing cache entry
								console.log("on the view all ", client.cache.extract());
								return existingRefs.map((ref) =>
									readField("id", ref) === Changes.id
										? client.cache.writeFragment({
												data: Changes,
												fragment: gql`
													fragment UpdatedMaterialRequest on MaterialRequest {
														id

														items {
															id
															itemName
															quantity
															itemDescription
															color
															side
															size
														}

														requester {
															userId
															name
															email
														}

														reviewers {
															userId
															email
															name
															comment
															reviewedAt
														}

														approvalStatus {
															approvedBy {
																userId
																name
																email
															}
														}

														createdAt
														updatedAt
													}
												`,
										  })
										: ref
								);
							} else if (eventType === "created") {
								//  Add new entry
								console.log("on the view all ", client.cache.extract());
								const newRef = client.cache.writeFragment({
									data: Changes,
									fragment: gql`
										fragment NewMaterialRequest on MaterialRequest {
											id

											items {
												id
												itemName
												quantity
												itemDescription
												color
												side
												size
											}

											requester {
												userId
												name
												email
											}

											reviewers {
												userId
												email
												name
												comment
												reviewedAt
											}

											approvalStatus {
												approvedBy {
													userId
													name
													email
												}
											}

											createdAt
											updatedAt
										}
									`,
								});
								return [...existingRefs, newRef];
							}

							// Default: return unmodified cache
							return existingRefs;
						},
					},
				});
			} catch (cacheErr) {
				console.warn(" Cache update skipped:", cacheErr.message);
			}
		},

		//  Handle subscription errors
		onError: (err) => {
			console.error(" Subscription error:", err);
		},
	});

	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		// setFilteredMRequests(searchAndSort(mRequests, val));
	};

	const clearSearch = () => {
		setSearchValue("");
		// setFilteredMRequests(searchAndSort(mRequests));
	};

	const canReview = () => {
		const token = jwtDecode(userToken);
		const role = typeof token?.role === "string" ? token?.role : token?.role?.role;

		return ["headAdmin", "admin", "subAdmin"].includes(role);
	};
	// console.log("requests", mRequests);
	// console.log("filtered  requests ", filteredMRequests);

	// console.log(client.clearStore());

	return (
		<>
			{loading ? (
				<div>
					<h1>Loading...</h1>
				</div>
			) : (
				<div className="list-get-all-content">
					{/* Search */}
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search users by Name,Email,#,Dep" value={searchValue} onChange={handleSearchChange} autoComplete="off" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					{/* Table */}
					<div className="table-wrapper">
						<table>
							<thead>
								<tr>
									{jwtDecode(userToken)?.role == "headAdmin" && <th>ID</th>}

									<th>Requestor's #</th>

									<th>Requestor's Name</th>
									<th>Description</th>
									<th>Approval</th>
									<th>Requested Date</th>
									<th>Amount of items</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredMRequests.length !== 0 ? (
									filteredMRequests.map((request) => (
										<tr key={request.id}>
											{jwtDecode(userToken)?.role == "headAdmin" && (
												<td>
													<Link to={`/material/request/${request.id}`}>{request.id}</Link>
												</td>
											)}

											<td>
												<Link to={`/material/request/${request.id}`}>{request?.requester?.employeeNum}</Link>
											</td>

											<td>
												<Link to={`/material/request/${request.id}`}>{request.requester?.name}</Link>
											</td>
											<td>{request.description}</td>
											<td>
												<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved ? "Approved" : "Waiting for approval"}</p>
											</td>
											<td>{dayjs(Number(request?.addedDate)).format("YYYY-MM-DD")}</td>
											<td>{request?.items?.length}</td>
											<td>
												<div className="table-action-wrapper">
													{/* canReview() */}
													{canReview() ? (
														<Link to={`/material/request/${request.id}/update`}>
															<span className="table-action first">Review</span>
														</Link>
													) : !request?.approvalStatus?.isApproved ? (
														<Link to={`/material/request/${request.id}/update`}>
															<span className="table-action first">Update Request</span>
														</Link>
													) : (
														<Link to={`/material/request/${request.id}`}>
															<span className="table-action second">View</span>
														</Link>
													)}
												</div>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={7} style={{ textAlign: "center" }}>
											<h1>N/A</h1>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}

// import React, { useEffect, useState } from "react";
// import { useQuery, useSubscription } from "@apollo/client";
// import { get_all_material_requests } from "../../../graphQL/queries/queries";
// import { Link } from "react-router-dom";
// import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
// import { gql } from "@apollo/client";
// // import client from "../../../graphQL/apolloClient";
// import Fuse from "fuse.js";
// import dayjs from "dayjs";
// import { useAuth } from "../../context/AuthContext";
// import { jwtDecode } from "jwt-decode";

// export default function GetAllMaterialRequest() {
// 	const { userToken } = useAuth();
// 	const { error, loading, data } = useQuery(get_all_material_requests, { fetchPolicy: "cache-and-network" });

// 	const [mRequests, setMRequests] = useState([]);
// 	const [filteredMRequests, setFilteredMRequests] = useState([]);
// 	const [searchValue, setSearchValue] = useState("");

// 	// Fetch and set requests
// 	useEffect(() => {
// 		if (data?.getAllMaterialRequests) {
// 			console.log("requests", data?.getAllMaterialRequests);
// 			setMRequests(data.getAllMaterialRequests);
// 			setFilteredMRequests(searchAndSort(data.getAllMaterialRequests));
// 		}
// 	}, [data]);

// 	// QuickSort: approval first (waiting = 0, approved = 1), then date descending
// 	const quickSortRequests = (arr) => {
// 		if (arr.length <= 1) return arr;

// 		const pivot = arr[arr.length - 1];
// 		const left = [];
// 		const right = [];

// 		for (let i = 0; i < arr.length - 1; i++) {
// 			const aApproved = arr[i]?.approvalStatus?.isApproved ? 1 : 0;
// 			const pivotApproved = pivot?.approvalStatus?.isApproved ? 1 : 0;

// 			if (aApproved < pivotApproved) {
// 				left.push(arr[i]);
// 			} else if (aApproved > pivotApproved) {
// 				right.push(arr[i]);
// 			} else {
// 				// Same approval → sort by date descending
// 				if (dayjs(arr[i].addedDate).valueOf() > dayjs(pivot.addedDate).valueOf()) {
// 					left.push(arr[i]);
// 				} else {
// 					right.push(arr[i]);
// 				}
// 			}
// 		}

// 		return [...quickSortRequests(left), pivot, ...quickSortRequests(right)];
// 	};

// 	// Combine search + sorting
// 	const searchAndSort = (list, search = "") => {
// 		const filtered = search ? applyFuse(list, search) : list;
// 		return quickSortRequests(filtered);
// 	};

// 	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
// 		onData: ({ data: subscriptionData, client }) => {
// 			const change = subscriptionData?.data?.onMaterialRequestChange;
// 			if (!change) return;

// 			const { eventType, Changes } = change;
// 			console.log("📡 Material Request subscription event:", eventType, Changes);

// 			//  Update local React state
// 			setMRequests((prevRequests) => {
// 				let updated = [...prevRequests];

// 				if (eventType === "created") {
// 					// Add new item only if it doesn't already exist
// 					const exists = prevRequests.some((r) => r.id === Changes.id);
// 					if (!exists) {
// 						updated = [...prevRequests, Changes];
// 					}
// 				} else if (eventType === "updated") {
// 					updated = prevRequests.map((req) => (req.id === Changes.id ? { ...req, ...Changes } : req));
// 				} else if (eventType === "deleted") {
// 					updated = prevRequests.filter((req) => req.id !== Changes.id);
// 				}

// 				//  Keep filtered list in sync
// 				setFilteredMRequests(searchAndSort(updated, searchValue));
// 				return updated;
// 			});

// 			//  OPTIONAL — Sync Apollo Cache
// 			try {
// 				console.log("on the view all ", client.cache.extract());
// 				client.cache.modify({
// 					fields: {
// 						getAllMaterialRequests(existingRefs = [], { readField }) {
// 							if (eventType === "deleted") {
// 								// 🗑 Remove from cache
// 								return existingRefs.filter((ref) => readField("id", ref) !== Changes.id);
// 							}

// 							// Find if the entry already exists
// 							const existingIndex = existingRefs.findIndex((ref) => readField("id", ref) === Changes.id);

// 							if (existingIndex > -1 && eventType === "updated") {
// 								//  Update existing cache entry
// 								console.log("on the view all ", client.cache.extract());
// 								return existingRefs.map((ref) =>
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

// 														createdAt
// 														updatedAt
// 													}
// 												`,
// 										  })
// 										: ref
// 								);
// 							} else if (eventType === "created") {
// 								//  Add new entry
// 								console.log("on the view all ", client.cache.extract());
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

// 											createdAt
// 											updatedAt
// 										}
// 									`,
// 								});
// 								return [...existingRefs, newRef];
// 							}

// 							// Default: return unmodified cache
// 							return existingRefs;
// 						},
// 					},
// 				});
// 			} catch (cacheErr) {
// 				console.warn(" Cache update skipped:", cacheErr.message);
// 			}
// 		},

// 		//  Handle subscription errors
// 		onError: (err) => {
// 			console.error(" Subscription error:", err);
// 		},
// 	});

// 	// Fuse.js search
// 	const applyFuse = (list, search) => {
// 		if (!search) return list;
// 		const fuse = new Fuse(list, { keys: ["requester.name", "requester.email"], threshold: 0.4 });
// 		return fuse.search(search).map((r) => r.item);
// 	};

// 	const handleSearchChange = (e) => {
// 		const val = e.target.value;
// 		setSearchValue(val);
// 		setFilteredMRequests(searchAndSort(mRequests, val));
// 	};

// 	const clearSearch = () => {
// 		setSearchValue("");
// 		setFilteredMRequests(searchAndSort(mRequests));
// 	};

// 	const canReview = () => {
// 		const token = jwtDecode(userToken);
// 		const role = typeof token?.role === "string" ? token?.role : token?.role?.role;

// 		return ["headAdmin", "admin", "subAdmin"].includes(role);
// 	};
// 	// console.log("requests", mRequests);
// 	// console.log("filtered  requests ", filteredMRequests);

// 	return (
// 		<>
// 			{loading ? (
// 				<div>
// 					<h1>Loading...</h1>
// 				</div>
// 			) : (
// 				<div className="list-get-all-content">
// 					{/* Search */}
// 					<div className="search-filter-wrapper">
// 						<div className="search-filter-container">
// 							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="off" />
// 							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
// 								✕
// 							</button>
// 						</div>
// 					</div>

// 					{/* Table */}
// 					<div className="table-wrapper">
// 						<table>
// 							<thead>
// 								<tr>
// 									<th>ID</th>
// 									<th>Requestor's Name</th>
// 									<th>Description</th>
// 									<th>Approval</th>
// 									<th>Requested Date</th>
// 									<th>Amount of items</th>
// 									<th>Action</th>
// 								</tr>
// 							</thead>
// 							<tbody>
// 								{filteredMRequests.length !== 0 ? (
// 									filteredMRequests.map((request) => (
// 										<tr key={request.id}>
// 											<td>
// 												<Link to={`/material/request/${request.id}`}>{request.id}</Link>
// 											</td>
// 											<td>
// 												<Link to={`/material/request/${request.id}`}>{request.requester?.name}</Link>
// 											</td>
// 											<td>{request.description}</td>
// 											<td>
// 												<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved ? "Approved" : "Waiting for approval"}</p>
// 											</td>
// 											<td>{dayjs(Number(request?.addedDate)).format("YYYY-MM-DD")}</td>
// 											<td>{request?.items?.length}</td>
// 											<td>
// 												<div className="table-action-wrapper">
// 													{/* canReview() */}
// 													{canReview() ? (
// 														<Link to={`/material/request/${request.id}/update`}>
// 															<span className="table-action first">Review</span>
// 														</Link>
// 													) : !request?.approvalStatus?.isApproved ? (
// 														<Link to={`/material/request/${request.id}/update`}>
// 															<span className="table-action first">Update Request</span>
// 														</Link>
// 													) : (
// 														<Link to={`/material/request/${request.id}`}>
// 															<span className="table-action second">View</span>
// 														</Link>
// 													)}
// 												</div>
// 											</td>
// 										</tr>
// 									))
// 								) : (
// 									<tr>
// 										<td colSpan={7} style={{ textAlign: "center" }}>
// 											<h1>N/A</h1>
// 										</td>
// 									</tr>
// 								)}
// 							</tbody>
// 						</table>
// 					</div>
// 				</div>
// 			)}
// 			{error && <p style={{ color: "red" }}>{error.message}</p>}
// 		</>
// 	);
// }
