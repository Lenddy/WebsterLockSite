import React, { useEffect, useState } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useMaterialRequests } from "../../../src/context/MaterialRequestContext";

export default function GetAllMaterialRequest() {
	const { userToken, setPageLoading } = useAuth();
	// const { error, loading, data } = useQuery(get_all_material_requests, {
	// 	// fetchPolicy: "cache",
	// 	fetchPolicy: "cache-and-network",
	// });

	const { requests: mRequests, loading, error } = useMaterialRequests();

	// const [mRequests, setMRequests] = useState([]);
	const [searchValue, setSearchValue] = useState("");

	const { t } = useTranslation();

	// Fetch and set requests
	useEffect(() => {
		setPageLoading(loading);

		// if (data?.getAllMaterialRequests) {
		// 	console.log("requests", data?.getAllMaterialRequests);
		// 	setMRequests(data.getAllMaterialRequests);
		// }
	}, [loading, setPageLoading]);
	// }, [data, loading, setPageLoading]);

	// const sortRequests = (arr) => {
	// 	const today = dayjs().startOf("day");

	// 	return [...arr].sort((a, b) => {
	// 		const aStatus = a?.approvalStatus?.isApproved;
	// 		const bStatus = b?.approvalStatus?.isApproved;

	// 		const aDate = dayjs(a?.addedDate);
	// 		const bDate = dayjs(b?.addedDate);

	// 		const aIsFutureOrToday = aDate.isSame(today, "day") || aDate.isAfter(today);
	// 		const bIsFutureOrToday = bDate.isSame(today, "day") || bDate.isAfter(today);

	// 		// 1️ Date ≥ today should come first
	// 		if (aIsFutureOrToday && !bIsFutureOrToday) return -1;
	// 		if (!aIsFutureOrToday && bIsFutureOrToday) return 1;

	// 		// 2️ Null approvalStatus goes to the top
	// 		if (aStatus === null && bStatus !== null) return -1;
	// 		if (aStatus !== null && bStatus === null) return 1;

	// 		// 3️ For both null OR both non-null → sort by newest date
	// 		return bDate.valueOf() - aDate.valueOf();
	// 	});
	// };

	const sortRequests = (arr) => {
		return [...arr].sort((a, b) => {
			const aStatus = a?.approvalStatus?.isApproved;
			const bStatus = b?.approvalStatus?.isApproved;

			const aDate = dayjs(a?.addedDate);
			const bDate = dayjs(b?.addedDate);

			// 1️ Null approvalStatus goes to the top
			if (aStatus === null && bStatus !== null) return -1;
			if (aStatus !== null && bStatus === null) return 1;

			// 2️ Same group → sort by newest date first
			return bDate.valueOf() - aDate.valueOf();
		});
	};

	// Fuse.js fuzzy search
	const applyFuse = (list, search) => {
		if (!search) return list;
		const fuse = new Fuse(list, {
			keys: ["requester.name", "requester.email", "requester.employeeNum", "requester.department"],
			threshold: 0.4,
		});
		return fuse.search(search).map((r) => r.item);
	};

	// Combine search + new sorting
	const searchAndSort = (list, search = "") => {
		const filtered = search ? applyFuse(list, search) : list;
		return sortRequests(filtered);
	};

	// Memoized sorted + filtered list
	const filteredMRequests = React.useMemo(() => searchAndSort(mRequests, searchValue), [mRequests, searchValue]);

	const handleSearchChange = (e) => {
		setSearchValue(e.target.value);
	};

	const clearSearch = () => {
		setSearchValue("");
	};

	const canReview = () => {
		const token = jwtDecode(userToken);
		const role = typeof token?.role === "string" ? token?.role : token?.role?.role;
		return ["headAdmin", "admin", "subAdmin"].includes(role);
	};

	// console.log("role", jwtDecode(userToken)?.role == "headAdmin");

	const formatDate = (date) => {
		if (!date) return "N/A";
		const parsedDate = isNaN(Number(date)) ? dayjs(date) : dayjs(Number(date));
		return parsedDate.isValid() ? parsedDate.format("YYYY-MM-DD") : "N/A";
	};
	// test

	// TODO - if a request has been approved by some one else alert the the users that one of their request  has been approved / denied

	return (
		<>
			{loading ? (
				<div>
					<h1>{t("loading")}</h1>
				</div>
			) : (
				<div className="list-get-all-content">
					{/* Search */}
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder={t("search-by")} value={searchValue} onChange={handleSearchChange} autoComplete="off" />
							{/* "Search users by Name,Email,#,Dep" */}
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					{/* Table */}
					<div className="table-wrapper">
						<div className="table-title">
							<h2>{t("material-requests")}</h2>
							{/* <h2>Requests</h2> */}
						</div>
						<table>
							<thead>
								<tr>
									{jwtDecode(userToken)?.role == "headAdmin" && <th>ID</th>}
									<th>#</th>
									<th>{t("requestors-name")}</th>
									<th>{t("description")}</th>
									<th>{t("approval")}</th>
									<th>{t("requested-date")}</th>
									<th>{t("amount-of-items")}</th>
									<th>{t("action")}</th>
								</tr>
							</thead>
							<tbody>
								{filteredMRequests.length !== 0 ? (
									filteredMRequests.map((request) => (
										<tr key={request?.id}>
											{jwtDecode(userToken)?.role == "headAdmin" && (
												<td>
													<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
												</td>
											)}
											<td>
												<Link to={`/material/request/${request?.id}`}>{request?.requester?.employeeNum ? request?.requester?.employeeNum : "N/A"}</Link>
											</td>
											<td>
												<Link to={`/material/request/${request?.id}`}>{request?.requester?.name}</Link>
											</td>
											<td>{request?.description}</td>
											<td>
												<p className={`${request?.approvalStatus?.isApproved === null ? "waiting-approval" : request?.approvalStatus?.isApproved === true ? "approved" : "denied"}`}>{request?.approvalStatus?.isApproved === null ? t("waiting-for-approval") : request?.approvalStatus?.isApproved === true ? t("Approved") : t("Denied")}</p>
											</td>

											{/* <td>{dayjs(Number(request?.addedDate)).format("YYYY-MM-DD")}</td> */}

											<td>{formatDate(request?.addedDate)}</td>

											<td>{request?.items?.length}</td>
											<td>
												<div className="table-action-wrapper">
													{canReview() ? (
														<Link to={`/material/request/${request?.id}/update`}>
															<span className="table-action first">{t("review")}</span>
														</Link>
													) : request?.approvalStatus?.isApproved === null ? (
														<Link to={`/material/request/${request?.id}/update`}>
															<span className="table-action first">{t("update request")}</span>
														</Link>
													) : (
														<Link to={`/material/request/${request?.id}`}>
															<span className="table-action second">{t("view")}</span>
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
