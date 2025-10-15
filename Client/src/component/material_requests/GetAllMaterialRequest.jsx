import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";

export default function GetAllMaterialRequest() {
	const { userToken } = useAuth();
	const { error, loading, data } = useQuery(get_all_material_requests, {
		fetchPolicy: "cache-and-network",
	});

	const [mRequests, setMRequests] = useState([]);
	const [filteredMRequests, setFilteredMRequests] = useState([]);
	const [searchValue, setSearchValue] = useState("");

	// Fetch and set requests
	useEffect(() => {
		if (data?.getAllMaterialRequests) {
			setMRequests(data.getAllMaterialRequests);
			setFilteredMRequests(searchAndSort(data.getAllMaterialRequests));
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

	// Combine search + sorting
	const searchAndSort = (list, search = "") => {
		const filtered = search ? applyFuse(list, search) : list;
		return quickSortRequests(filtered);
	};

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

				setFilteredMRequests(searchAndSort(updated, searchValue));
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
		setFilteredMRequests(searchAndSort(mRequests, val));
	};

	const clearSearch = () => {
		setSearchValue("");
		setFilteredMRequests(searchAndSort(mRequests));
	};

	const canReview = () => {
		const token = jwtDecode(userToken);
		const role = typeof token?.role === "string" ? token?.role : token?.role?.role;
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
									<th>Approval</th>
									<th style={{ paddingRight: "15px" }}>Requested Date</th>
									<th>Amount of items</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredMRequests.length !== 0 ? (
									filteredMRequests.map((request) => (
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
