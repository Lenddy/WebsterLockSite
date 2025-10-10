import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext"; // <-- use context

export default function GetAllMaterialRequest() {
	const { logUser } = useAuth(); // <-- get user info from context
	const { error, loading, data } = useQuery(get_all_material_requests);
	// { fetchPolicy: "cache-and-network" }

	const [mRequests, setMRequests] = useState([]);
	const [filteredMRequests, setFilteredMRequests] = useState([]);
	const [searchValue, setSearchValue] = useState("");
	const [sortDateAsc, setSortDateAsc] = useState(false); // false = newest first
	const [sortApprovalAsc, setSortApprovalAsc] = useState(false); // false = waiting first

	useEffect(() => {
		if (data) {
			setMRequests(data.getAllMaterialRequests);

			// default sorted: newest first
			const sorted = sortByDate(data.getAllMaterialRequests, false);
			setFilteredMRequests(sortByApproval(sorted, sortApprovalAsc));
		}
	}, [data]);

	// Subscription for live updates
	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			const change = subscriptionData?.data?.onMaterialRequestChange;
			if (!change) return;

			const { eventType, Changes } = change;

			setMRequests((prevRequests) => {
				let updated;
				if (eventType === "created") updated = [...prevRequests, Changes];
				else if (eventType === "updated") updated = prevRequests.map((req) => (req.id === Changes.id ? Changes : req));
				else if (eventType === "deleted") updated = prevRequests.filter((req) => req.id !== Changes.id);
				else updated = prevRequests;

				// Apply search filter
				if (searchValue) setFilteredMRequests(applyFuse(updated, searchValue));
				else {
					let sorted = sortByDate(updated, sortDateAsc);
					sorted = sortByApproval(sorted, sortApprovalAsc);
					setFilteredMRequests(sorted);
				}

				return updated;
			});
		},
		onError: (err) => console.log("Subscription error:", err),
	});

	// Fuse.js search
	const applyFuse = (list, search) => {
		if (!search) return list;
		const fuse = new Fuse(list, { keys: ["requester.name", "requester.email"], threshold: 0.4 });
		return fuse.search(search).map((r) => r.item);
	};

	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		let filtered = applyFuse(mRequests, val);
		filtered = sortByDate(filtered, sortDateAsc);
		filtered = sortByApproval(filtered, sortApprovalAsc);
		setFilteredMRequests(filtered);
	};

	const clearSearch = () => {
		setSearchValue("");
		let sorted = sortByDate(mRequests, sortDateAsc);
		sorted = sortByApproval(sorted, sortApprovalAsc);
		setFilteredMRequests(sorted);
	};

	const sortByDate = (list, ascending = false) => {
		return [...list].sort((a, b) => {
			const dateA = dayjs(Number(a.addedDate));
			const dateB = dayjs(Number(b.addedDate));

			// descending by default → newest first
			return ascending ? dateA.valueOf() - dateB.valueOf() : dateB.valueOf() - dateA.valueOf();
		});
	};

	const sortByApproval = (list, ascending = false) => {
		return [...list].sort((a, b) => {
			const aStatus = a?.approvalStatus?.isApproved ? 1 : 0;
			const bStatus = b?.approvalStatus?.isApproved ? 1 : 0;

			if (aStatus !== bStatus) {
				return ascending ? aStatus - bStatus : bStatus - aStatus;
			} else {
				const dateA = dayjs(Number(a.addedDate));
				const dateB = dayjs(Number(b.addedDate));
				return dateB.valueOf() - dateA.valueOf(); // newest first by default
			}
		});
	};

	const toggleDateSort = () => {
		setSortDateAsc((prev) => !prev);
		const sorted = sortByDate(filteredMRequests, !sortDateAsc);
		setFilteredMRequests(sortByApproval(sorted, sortApprovalAsc));
	};

	const toggleApprovalSort = () => {
		setSortApprovalAsc((prev) => !prev);
		setFilteredMRequests(sortByApproval(filteredMRequests, !sortApprovalAsc));
	};

	// Determine if the current user can review material requests
	const canReview = () => {
		const role = typeof logUser?.role === "string" ? logUser.role : logUser?.role?.role;
		console.log("this is the role", role);
		return ["headAdmin", "admin", "subAdmin"].includes(role);
	};

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
							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="off" />
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
									<th>ID</th>
									<th>Requestor's Name</th>
									<th>Description</th>
									<th style={{ cursor: "pointer" }} onClick={toggleApprovalSort} title="Sort by approval">
										Approval {sortApprovalAsc ? "↑" : "↓"}
									</th>
									<th style={{ cursor: "pointer" }} onClick={toggleDateSort} title="Sort by date">
										Requested Date {sortDateAsc ? "↑" : "↓"}
									</th>
									<th>Amount of items</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredMRequests.map((request) => (
									<tr key={request.id}>
										<td>
											<Link to={`/material/request/${request.id}`}>{request.id}</Link>
										</td>
										<td>
											<Link to={`/material/request/${request.id}`}>{request.requester?.name}</Link>
										</td>
										<td>{request.description}</td>
										<td>
											<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved ? "Approved" : "Waiting for approval"}</p>
										</td>
										<td>{dayjs(Number(request?.addedDate)).format("YYYY-MM-DD")}</td>
										{/* <td>{dayjs(request?.addedDate).format("YYYY-MM-DD")}</td> */}
										<td>{request?.items.length}</td>
										<td>
											<div className="table-action-wrapper">
												{canReview() ? (
													<Link to={`/material/request/${request.id}/update`}>
														<span className="table-action first">Review</span>
													</Link>
												) : (
													<Link to={`/material/request/${request.id}`}>
														<span className="table-action second">View</span>
													</Link>
												)}
											</div>
										</td>
									</tr>
								))}
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
// import { jwtDecode } from "jwt-decode";
// import { get_all_material_requests } from "../../../graphQL/queries/queries";
// import { Link } from "react-router-dom";
// import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
// import Fuse from "fuse.js";
// import dayjs from "dayjs";

// export default function GetAllMaterialRequest({ userToken }) {
// 	const { error, loading, data } = useQuery(get_all_material_requests, { fetchPolicy: "cache-and-network" });

// 	const [mRequests, setMRequests] = useState([]);
// 	const [filteredMRequests, setFilteredMRequests] = useState([]);
// 	const [logUser, setLogUser] = useState({});
// 	const [searchValue, setSearchValue] = useState("");

// 	const [sortDateAsc, setSortDateAsc] = useState(false); // false = newest first
// 	const [sortApprovalAsc, setSortApprovalAsc] = useState(false); // false = waiting first

// 	useEffect(() => {
// 		if (data) {
// 			setMRequests(data.getAllMaterialRequests);
// 			setFilteredMRequests(sortByDate(data.getAllMaterialRequests, sortDateAsc));
// 		}
// 	}, [data]);

// 	// Subscription for live updates
// 	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
// 		onData: ({ data: subscriptionData }) => {
// 			const change = subscriptionData?.data?.onMaterialRequestChange;
// 			console.log("new changes on the get all", change);
// 			if (!change) return;

// 			const { eventType, Changes } = change;

// 			setMRequests((prevRequests) => {
// 				let updated;

// 				if (eventType === "created") updated = [...prevRequests, Changes];
// 				else if (eventType === "updated") updated = prevRequests.map((req) => (req.id === Changes.id ? Changes : req));
// 				else if (eventType === "deleted") updated = prevRequests.filter((req) => req.id !== Changes.id);
// 				else updated = prevRequests;

// 				// Apply search filter
// 				if (searchValue) setFilteredMRequests(applyFuse(updated, searchValue));
// 				else {
// 					// Apply both sorts
// 					let sorted = sortByDate(updated, sortDateAsc);
// 					sorted = sortByApproval(sorted, sortApprovalAsc);
// 					setFilteredMRequests(sorted);
// 				}

// 				return updated;
// 			});
// 		},
// 		onError: (err) => console.log("Subscription error:", err),
// 	});

// 	// Fuse.js search
// 	const applyFuse = (list, search) => {
// 		if (!search) return list;

// 		const fuse = new Fuse(list, {
// 			keys: ["requester.name", "requester.email"],
// 			threshold: 0.4,
// 		});

// 		return fuse.search(search).map((r) => r.item);
// 	};

// 	const handleSearchChange = (e) => {
// 		const val = e.target.value;
// 		setSearchValue(val);
// 		let filtered = applyFuse(mRequests, val);
// 		filtered = sortByDate(filtered, sortDateAsc);
// 		filtered = sortByApproval(filtered, sortApprovalAsc);
// 		setFilteredMRequests(filtered);
// 	};

// 	const clearSearch = () => {
// 		setSearchValue("");
// 		let sorted = sortByDate(mRequests, sortDateAsc);
// 		sorted = sortByApproval(sorted, sortApprovalAsc);
// 		setFilteredMRequests(sorted);
// 	};

// 	// // Sort by addedDate
// 	// const sortByDate = (list, ascending = false) => {
// 	// 	return [...list].sort((a, b) => {
// 	// 		const dateA = dayjs(a.addedDate);
// 	// 		const dateB = dayjs(b.addedDate);
// 	// 		console.log("a", dateA, "b", dateB);
// 	// 		return ascending ? dateA - dateB : dateB - dateA;
// 	// 	});
// 	// };

// 	const sortByDate = (list, ascending = false) => {
// 		return [...list].sort((a, b) => {
// 			const dateA = dayjs(a.addedDate); // must be ISO string from DB
// 			const dateB = dayjs(b.addedDate);
// 			return ascending ? dateA.valueOf() - dateB.valueOf() : dateB.valueOf() - dateA.valueOf();
// 		});
// 	};

// 	// Sort by approval status (waiting first) and then by date
// 	const sortByApproval = (list, ascending = false) => {
// 		return [...list].sort((a, b) => {
// 			const aStatus = a?.approvalStatus?.isApproved ? 1 : 0; // approved=1, waiting=0
// 			const bStatus = b?.approvalStatus?.isApproved ? 1 : 0;

// 			if (aStatus !== bStatus) {
// 				return ascending ? aStatus - bStatus : bStatus - aStatus; // waiting first if ascending=false
// 			} else {
// 				// If same status, sort by date descending
// 				const dateA = dayjs(a.addedDate);
// 				const dateB = dayjs(b.addedDate);
// 				return dateB - dateA;
// 			}
// 		});
// 	};

// 	const toggleDateSort = () => {
// 		setSortDateAsc((prev) => !prev);
// 		const sorted = sortByDate(filteredMRequests, !sortDateAsc);
// 		setFilteredMRequests(sortByApproval(sorted, sortApprovalAsc));
// 	};

// 	const toggleApprovalSort = () => {
// 		setSortApprovalAsc((prev) => !prev);
// 		setFilteredMRequests(sortByApproval(filteredMRequests, !sortApprovalAsc));
// 	};

// 	return (
// 		<>
// 			{loading ? (
// 				<div>
// 					<h1>loading...</h1>
// 				</div>
// 			) : (
// 				<div className="list-get-all-content">
// 					<div className="search-filter-wrapper">
// 						<div className="search-filter-container">
// 							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="off" />
// 							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
// 								✕
// 							</button>
// 						</div>
// 					</div>

// 					<div className="table-wrapper">
// 						<table>
// 							<thead>
// 								<tr>
// 									<th>ID</th>
// 									<th>Requestors Name</th>
// 									<th>Description</th>
// 									<th style={{ cursor: "pointer" }} onClick={toggleApprovalSort} title="Sort by approval">
// 										Approval {sortApprovalAsc ? "↑" : "↓"}
// 									</th>
// 									<th style={{ cursor: "pointer" }} onClick={toggleDateSort} title="Sort by date">
// 										Requested Date {sortDateAsc ? "↑" : "↓"}
// 									</th>
// 									<th>Amount of items</th>
// 									<th>Action</th>
// 								</tr>
// 							</thead>
// 							<tbody>
// 								{filteredMRequests.map((request) => (
// 									<tr key={request.id}>
// 										<td>
// 											<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
// 										</td>

// 										<td>
// 											<Link to={`/material/request/${request?.id}`}>{request?.requester?.name}</Link>
// 										</td>
// 										<td>{request?.description}</td>

// 										<td>
// 											<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved ? "Approved" : "Waiting for approval"}</p>
// 										</td>

// 										<td>{dayjs(request?.addedDate).format("YYYY-MM-DD")}</td>

// 										<td>{request?.items.length}</td>

// 										<td>
// 											<div className="table-action-wrapper">
// 												{["headAdmin", "admin", "subAdmin"].includes(jwtDecode(userToken).role) ? (
// 													<Link to={`/material/request/${request.id}/update`}>
// 														<span className="table-action first">Review</span>
// 													</Link>
// 												) : (
// 													<Link to={`/material/request/${request.id}`}>
// 														<span className="table-action second">View</span>
// 													</Link>
// 												)}
// 											</div>
// 										</td>
// 									</tr>
// 								))}
// 							</tbody>
// 						</table>
// 					</div>
// 				</div>
// 			)}
// 			{error && <p style={{ color: "red" }}> {error.message}</p>}
// 		</>
// 	);
// }

// !!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!

// import React, { useEffect, useState } from "react";
// import { useQuery, useSubscription } from "@apollo/client";
// import { jwtDecode } from "jwt-decode";
// import { get_all_material_requests } from "../../../graphQL/queries/queries";
// import { Link } from "react-router-dom";
// import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
// import Fuse from "fuse.js";
// import dayjs from "dayjs";

// export default function GetAllMaterialRequest({ userToken }) {
// 	const { error, loading, data } = useQuery(get_all_material_requests);
// 	const [mRequests, setMRequests] = useState([]);
// 	const [filteredMRequests, setFilteredMRequests] = useState([]);
// 	const [logUser, setLogUser] = useState({});
// 	const [searchValue, setSearchValue] = useState("");
// 	const [sortAsc, setSortAsc] = useState(false); // false = newest first

// 	useEffect(() => {
// 		setLogUser(jwtDecode(localStorage.getItem("UserToken")));

// 		if (data) {
// 			setMRequests(data.getAllMaterialRequests);
// 			setFilteredMRequests(sortByDate(data.getAllMaterialRequests, sortAsc));
// 		}
// 	}, [data]);

// 	// Subscription for live updates
// 	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
// 		onData: ({ data: subscriptionData }) => {
// 			const change = subscriptionData?.data?.onMaterialRequestChange;
// 			if (!change) return;

// 			const { eventType, Changes } = change;

// 			setMRequests((prevRequests) => {
// 				let updated;

// 				if (eventType === "created") {
// 					updated = [...prevRequests, Changes];
// 				} else if (eventType === "updated") {
// 					updated = prevRequests.map((req) => (req.id === Changes.id ? Changes : req));
// 				} else if (eventType === "deleted") {
// 					updated = prevRequests.filter((req) => req.id !== Changes.id);
// 				} else {
// 					updated = prevRequests;
// 				}

// 				// Apply search filter
// 				if (searchValue) {
// 					setFilteredMRequests(applyFuse(updated, searchValue));
// 				} else {
// 					setFilteredMRequests(sortByDate(updated, sortAsc));
// 				}

// 				return updated;
// 			});
// 		},
// 		onError: (err) => console.log("Subscription error:", err),
// 	});

// 	// Fuse.js search
// 	const applyFuse = (list, search) => {
// 		if (!search) return list;

// 		const fuse = new Fuse(list, {
// 			keys: ["requester.name", "requester.email"],
// 			threshold: 0.3,
// 		});

// 		return fuse.search(search).map((r) => r.item);
// 	};

// 	const handleSearchChange = (e) => {
// 		const val = e.target.value;
// 		setSearchValue(val);
// 		const filtered = applyFuse(mRequests, val);
// 		setFilteredMRequests(sortByDate(filtered, sortAsc));
// 	};

// 	const clearSearch = () => {
// 		setSearchValue("");
// 		setFilteredMRequests(sortByDate(mRequests, sortAsc));
// 	};

// 	// Sorting function by addedDate using Day.js
// 	const sortByDate = (list, ascending = false) => {
// 		return [...list].sort((a, b) => {
// 			const dateA = dayjs(a.addedDate);
// 			const dateB = dayjs(b.addedDate);
// 			return ascending ? dateA - dateB : dateB - dateA; // newest first if ascending=false
// 		});
// 	};

// 	// Toggle sorting
// 	const toggleSort = () => {
// 		setSortAsc((prev) => !prev);
// 		setFilteredMRequests(sortByDate(filteredMRequests, !sortAsc));
// 	};

// 	return (
// 		<>
// 			{loading ? (
// 				<div>
// 					<h1>loading...</h1>
// 				</div>
// 			) : (
// 				<div className="list-get-all-content">
// 					<div className="search-filter-wrapper">
// 						<div className="search-filter-container">
// 							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="off" />
// 							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
// 								✕
// 							</button>
// 						</div>
// 					</div>

// 					<div className="table-wrapper">
// 						<table>
// 							<thead>
// 								<tr>
// 									<th>ID</th>
// 									<th>Requestors Name</th>
// 									<th>Description</th>
// 									<th style={{ cursor: "pointer" }} onClick={toggleSort} title="Sort by date">
// 										Approval {sortAsc ? "↑" : "↓"}
// 									</th>
// 									<th>Amount of items</th>
// 									<th>Action</th>
// 								</tr>
// 							</thead>
// 							<tbody>
// 								{filteredMRequests.map((request) => (
// 									<tr key={request.id}>
// 										<td>
// 											<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
// 										</td>

// 										<td>
// 											<Link to={`/material/request/${request?.id}`}>{request?.requester?.name}</Link>
// 										</td>
// 										<td>{request?.description}</td>

// 										<td>
// 											<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved ? "Approved" : "Waiting for approval"}</p>
// 										</td>

// 										<td>{request?.items.length}</td>

// 										<td>
// 											<div className="table-action-wrapper">
// 												{["headAdmin", "admin", "subAdmin"].includes(jwtDecode(userToken).role) ? (
// 													<Link to={`/material/request/${request.id}/update`}>
// 														<span className="table-action first">Review</span>
// 													</Link>
// 												) : (
// 													<Link to={`/material/request/${request.id}`}>
// 														<span className="table-action second">View</span>
// 													</Link>
// 												)}
// 											</div>
// 										</td>
// 									</tr>
// 								))}
// 							</tbody>
// 						</table>
// 					</div>
// 				</div>
// 			)}
// 			{error && <p style={{ color: "red" }}> {error.message}</p>}
// 		</>
// 	);
// }

// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!

// import React, { useEffect, useState } from "react";
// import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
// import { jwtDecode } from "jwt-decode";
// import { get_all_material_requests } from "../../../graphQL/queries/queries";
// import { Link } from "react-router-dom";
// import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
// import Fuse from "fuse.js";

// export default function GetAllMaterialRequest({ userToken }) {
// 	const { error, loading, data, refetch } = useQuery(get_all_material_requests);
// 	const [mRequests, setMRequests] = useState([]);
// 	const [logUser, setLogUser] = useState({});

// 	useEffect(() => {
// 		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
// 		if (loading) {
// 			console.log("loading");
// 		}
// 		if (data) {
// 			console.log(data.getAllMaterialRequests);
// 			setMRequests(data.getAllMaterialRequests);
// 			setFilteredMRequests(data.getAllMaterialRequests);
// 		}
// 		if (error) {
// 			console.log("there was an error", error);
// 		}
// 		// const fetchData = async () => {
// 		// 	await refetch();
// 		// };
// 		// fetchData();
// 	}, [loading, data, error]); //refetch

// 	// Subscription for live updates
// 	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
// 		onData: ({ data: subscriptionData }) => {
// 			const change = subscriptionData?.data?.onMaterialRequestChange;
// 			if (!change) return;

// 			const { eventType, Changes } = change;

// 			setMRequests((prevRequests) => {
// 				let updated;

// 				if (eventType === "created") {
// 					updated = [...prevRequests, Changes];
// 				} else if (eventType === "updated") {
// 					updated = prevRequests.map((req) => (req.id === Changes.id ? Changes : req));
// 				} else if (eventType === "deleted") {
// 					updated = prevRequests.filter((req) => req.id !== Changes.id);
// 				} else {
// 					updated = prevRequests;
// 				}

// 				// Reapply current filter (just like in users)
// 				if (searchValue) {
// 					setFilteredMRequests(applyFuse(updated, searchValue));
// 				} else {
// 					setFilteredMRequests(updated);
// 				}

// 				return updated;
// 			});
// 		},
// 		onError: (err) => console.log("Subscription error:", err),
// 	});

// 	// Fuse.js search function
// 	const applyFuse = (list, search) => {
// 		if (!search) return list;

// 		const fuse = new Fuse(list, {
// 			keys: ["requester.name", "requester.email"],
// 			threshold: 0.3,
// 		});

// 		return fuse.search(search).map((r) => r.item);
// 	};

// 	const handleSearchChange = (e) => {
// 		const val = e.target.value;
// 		setSearchValue(val);
// 		setFilteredMRequests(applyFuse(mRequests, val));
// 	};

// 	// Clear search manually
// 	const clearSearch = () => {
// 		setSearchValue("");
// 		setFilteredMRequests(mRequests);
// 	};

// 	const [filteredMRequests, setFilteredMRequests] = useState([]);
// 	const [searchValue, setSearchValue] = useState("");

// 	return (
// 		<>
// 			{loading ? (
// 				<div>
// 					<h1>loading...</h1>
// 				</div>
// 			) : (
// 				<div className="list-get-all-content">
// 					<div className="search-filter-wrapper">
// 						<div className="search-filter-container">
// 							<input type="text" className="search-filter-input" placeholder="Search users by name or email" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
// 							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
// 								✕
// 							</button>
// 						</div>
// 					</div>

// 					<div className="table-wrapper">
// 						<table>
// 							<thead>
// 								<tr>
// 									<th>ID</th>
// 									<th>Requestors Name</th>
// 									<th>Description</th>
// 									<th>Approval</th>
// 									<th>Amount of items</th>
// 									<th>Action</th>
// 									{/*<th>Job</th>
// 									<th>Action</th> */}
// 								</tr>
// 							</thead>
// 							<tbody>
// 								{filteredMRequests.map((request) => {
// 									return (
// 										<tr key={request.id}>
// 											<td>
// 												<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
// 											</td>

// 											<td>
// 												<Link to={`/material/request/${request?.id}`}>{request?.requester?.name}</Link>
// 											</td>
// 											<td>{request?.description}</td>

// 											<td>
// 												{" "}
// 												<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved === true ? "Approved" : "Waiting for approval"}</p>
// 											</td>

// 											<td>{request?.items.length}</td>

// 											<td>
// 												<div className="table-action-wrapper">

// 													{["headAdmin", "admin", "subAdmin"].includes(jwtDecode(userToken).role) ? (
// 														<Link to={`/material/request/${request.id}/update`}>
// 															{/* <span className="table-action first">Update</span> */}
// 															<span className="table-action first">Review</span>
// 														</Link>
// 													) : (
// 														<Link to={`/material/request/${request.id}`}>
// 															{/* <span className="table-action first">Update</span> */}
// 															<span className="table-action second">view</span>
// 														</Link>
// 													)}

// 													{/* <span
// 														className="table-action last"
// 														onClick={() => {

// 														}}>
// 														Delete
// 													</span> */}
// 												</div>
// 											</td>
// 										</tr>
// 									);
// 								})}
// 							</tbody>
// 						</table>
// 					</div>
// 				</div>
// 			)}
// 			{error && <p style={{ color: "red" }}> {error.message}</p>}
// 		</>
// 	);
// }
