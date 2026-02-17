import React, { useEffect, useMemo, useState } from "react";
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
import { STORAGE_KEYS } from "../utilities/activeTabs";

export default function GetAllMaterialRequest() {
	const { userToken, setPageLoading } = useAuth();
	// const { error, loading, data } = useQuery(get_all_material_requests, {
	// 	// fetchPolicy: "cache",
	// 	fetchPolicy: "cache-and-network",
	// });

	// 	const STORAGE_KEYS = {
	//   SORT_KEY: "materialRequestsSortKey",
	//   SORT_DIR: "materialRequestsSortDir",
	//   ACTIVE_TAB: "materialRequestsActiveTab",
	// };

	const TAB_STORAGE_KEY = "materialRequestsActiveTab";
	// 	const [activeTab, setActiveTab] = useState( ()=>{
	// 		return localStorage.getItem(TAB_STORAGE_KEY) ||"waiting"
	// 	});// "waiting" | "approved" | "all"

	const [activeTab, setActiveTab] = useState(() => {
		const savedTab = localStorage.getItem(STORAGE_KEYS.MATERIAL_REQUESTS.ACTIVE_TAB);

		// Validate value (prevents corrupted storage bugs)
		if (["waiting", "approved", "all"].includes(savedTab)) {
			return savedTab;
		}

		return "waiting";
	});

	useEffect(() => {}, [activeTab]);

	const filterByTab = (list, tab) => {
		switch (tab) {
			case "waiting":
				return list.filter((req) => req?.approvalStatus?.isApproved === null);

			case "approved":
				return list.filter((req) => req?.approvalStatus?.isApproved === true);

			case "all":
			default:
				return list;
		}
	};

	// Sorting storage keys
	const SORT_KEY_STORAGE = "materialRequestsSortKey";
	const SORT_DIR_STORAGE = "materialRequestsSortDir";

	const [sortKey, setSortKey] = useState(() => {
		return localStorage.getItem(STORAGE_KEYS.MATERIAL_REQUESTS.SORT_KEY) || "addedDate";
	});

	const [sortDir, setSortDir] = useState(() => {
		return localStorage.getItem(STORAGE_KEYS.MATERIAL_REQUESTS.SORT_DIR) || "desc";
	});

	useEffect(() => {
		localStorage.setItem(STORAGE_KEYS.MATERIAL_REQUESTS.ACTIVE_TAB, activeTab);
		localStorage.setItem(STORAGE_KEYS.MATERIAL_REQUESTS.SORT_KEY, sortKey);
		localStorage.setItem(STORAGE_KEYS.MATERIAL_REQUESTS.SORT_DIR, sortDir);
	}, [activeTab, sortKey, sortDir]);

	// const sortRequests = (list, key, dir) => {
	// 	return [...list].sort((a, b) => {
	// 		if (key === "addedDate") {
	// 			const aDate = dayjs(a?.addedDate);
	// 			const bDate = dayjs(b?.addedDate);

	// 			if (!aDate.isValid()) return 1;
	// 			if (!bDate.isValid()) return -1;

	// 			return dir === "asc" ? aDate.valueOf() - bDate.valueOf() : bDate.valueOf() - aDate.valueOf();
	// 		}

	// 		return 0;
	// 	});
	// };

	const sortRequests = (list, key, dir) => {
		return [...list].sort((a, b) => {
			if (key === "addedDate") {
				const normalizeDate = (value) => {
					if (!value) return 0;

					// If it's already a number (timestamp)
					if (!isNaN(Number(value))) {
						return Number(value);
					}

					// Otherwise parse with dayjs and force ISO
					const parsed = dayjs(value);
					return parsed.isValid() ? parsed.valueOf() : 0;
				};

				const aTime = normalizeDate(a?.addedDate);
				const bTime = normalizeDate(b?.addedDate);

				return dir === "asc" ? aTime - bTime : bTime - aTime;
			}

			if (key === "requesterName") {
				const aName = a?.requester?.name ?? "";
				const bName = b?.requester?.name ?? "";

				return dir === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
			}

			if (key === "employeeNum") {
				const aNum = Number(a?.requester?.employeeNum) || 0;
				const bNum = Number(b?.requester?.employeeNum) || 0;

				return dir === "asc" ? aNum - bNum : bNum - aNum;
			}

			return 0;
		});
	};

	const handleSort = (key) => {
		if (sortKey === key) {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	};

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
	// 	return [...arr].sort((a, b) => {
	// 		const aStatus = a?.approvalStatus?.isApproved;
	// 		const bStatus = b?.approvalStatus?.isApproved;

	// 		const aDate = dayjs(a?.addedDate);
	// 		const bDate = dayjs(b?.addedDate);

	// 		// 1️ Null approvalStatus goes to the top
	// 		if (aStatus === null && bStatus !== null) return -1;
	// 		if (aStatus !== null && bStatus === null) return 1;

	// 		// 2️ Same group → sort by newest date first
	// 		return bDate.valueOf() - aDate.valueOf();
	// 	});
	// };

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
	// const searchAndSort = (list, search = "") => {
	// 	const filtered = search ? applyFuse(list, search) : list;
	// 	// return sortRequests(filtered);
	// 	// this is new for the sorting
	// 	const searched = searchValue ? applyFuse(tabFiltered, searchValue) : tabFiltered;

	// 	return sortRequests(searched, sortKey, sortDir);
	// };

	const filteredMRequests = React.useMemo(() => {
		const tabFiltered = filterByTab(mRequests, activeTab);

		const searched = searchValue ? applyFuse(tabFiltered, searchValue) : tabFiltered;

		return sortRequests(searched, sortKey, sortDir);
	}, [mRequests, searchValue, activeTab, sortKey, sortDir]);

	// Memoized sorted + filtered list
	// const filteredMRequests = React.useMemo(() => searchAndSort(mRequests, searchValue), [mRequests, searchValue]);

	// const filteredMRequests = React.useMemo(() => {
	// 	const tabFiltered = filterByTab(mRequests, activeTab);
	// 	return searchAndSort(tabFiltered, searchValue);
	// }, [mRequests, searchValue, activeTab]);

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

	// there is a small problem some items are where they are not supposed to be for example i see that one item that is from 2026 that is second  whne one that is from 2025 is above and the others are bellow  if it is descending it should go by the yea-month-day
	//  so the the higher the year-month-day should be on top  example 2026-02-1 should be on top of  2026-01-31  be cause the the month if higher and if they are in the same year and month is base by the day  the higher the day is going to be on top of lower days 10 is going to be on top of 9 n 9 is going to be on top of 8 and the oposite will happen if it is ascending

	return (
		<>
			{loading ? (
				<div>
					<h1>{t("loading")}</h1>
				</div>
			) : (
				<div className="list-get-all-content">
					{/* <h2>{t("material-requests")}</h2> */}

					{/* Search */}
					<div className="search-filter-wrapper">
						<div className="component-title">
							<h2>{t("material-requests")}</h2>
						</div>

						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder={t("search-by")} value={searchValue} onChange={handleSearchChange} autoComplete="off" />
							{/* "Search users by Name,Email,#,Dep" */}
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					{/* 
				
				
				//TODO - make sure that the selected tab has an underline in users and the others    also the ad the filter to items if need you need to modify it any ways  adding the table scroll clase
				
						ADD THE UNDERLINE TO THE TABS IN THE USERS SIDE AND ALSO MAKE SURE THEY HAVE THE TABLE SCROLL CLASE(THE TABLE NOT THE TABS)



				
				*/}

					{/* Tabs */}

					{/* Table */}
					<div className="table-wrapper">
						<div className="table-title">
							<div className="table-title-inner">
								{/* <h2>{t("material-requests")}</h2> */}
								{/* <h2>Requests</h2> */}

								<div className="tabs-wrapper-filter-btn">
									<button
										//  className={`     tab-btn  ${activeTab === "waiting" ? "active" : ""}`}
										className={`filter-btn  ${activeTab === "waiting" ? "selected-filter" : ""}`}
										onClick={() => setActiveTab("waiting")}>
										Waiting
									</button>

									<button
										// className={`tab-btn ${activeTab === "approved" ? "active" : ""}`}
										className={`filter-btn ${activeTab === "approved" ? "selected-filter" : ""}`}
										onClick={() => setActiveTab("approved")}>
										Approved
									</button>

									<button
										// className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
										className={`filter-btn ${activeTab === "all" ? "selected-filter" : ""}`}
										onClick={() => setActiveTab("all")}>
										All
									</button>
								</div>
							</div>
						</div>

						<div className="table-scroll">
							<table>
								<thead>
									<tr>
										{jwtDecode(userToken)?.role == "headAdmin" && <th>ID</th>}

										{/* <th onClick={() => handleSort("employeeNum")} className="clickable-th">
											# {sortKey === "employeeNum" && (sortDir === "asc" ? "▾" : "▴")}
										</th> */}

										<th onClick={() => handleSort("employeeNum")} className={`clickable-th ${sortKey === "employeeNum" ? "active-sort" : ""}`}>
											# {sortKey === "employeeNum" && (sortDir === "asc" ? "▾" : "▴")}
										</th>

										{/* <th>#</th> */}

										<th onClick={() => handleSort("requesterName")} className={`clickable-th ${sortKey === "requesterName" ? "active-sort" : ""}`}>
											{t("requestors-name")} {sortKey === "requesterName" && (sortDir === "asc" ? "▾" : "▴")}
										</th>

										{/* <th onClick={() => handleSort("addedDate")} className="clickable-th">
											{t("requested-date")} {sortKey === "addedDate" && (sortDir === "asc" ? "▾" : "▴")}
										</th> */}

										<th onClick={() => handleSort("addedDate")} className={`clickable-th ${sortKey === "addedDate" ? "active-sort" : ""}`}>
											{t("requested-date")} {sortKey === "addedDate" && (sortDir === "asc" ? "▾" : "▴")}
										</th>

										{/* <th>{t("requestors-name")}</th> */}
										<th>{t("approval")}</th>
										<th>{t("description")}</th>

										{/* <th>{t("requested-date")}</th> */}
										{/* <th>{t("amount-of-items")}</th> */}
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
												<td>{formatDate(request?.addedDate)}</td>

												<td>
													<p className={`${request?.approvalStatus?.isApproved === null ? "waiting-approval" : request?.approvalStatus?.isApproved === true ? "approved" : "denied"}`}>{request?.approvalStatus?.isApproved === null ? t("waiting-for-approval") : request?.approvalStatus?.isApproved === true ? t("Approved") : t("Denied")}</p>
												</td>
												<td>{request?.description}</td>

												{/* <td>{dayjs(Number(request?.addedDate)).format("YYYY-MM-DD")}</td> */}

												{/* <td>{request?.items?.length}</td> */}
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
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}
