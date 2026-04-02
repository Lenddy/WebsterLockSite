import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link, useNavigate } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useMaterialRequests } from "../../../src/context/MaterialRequestContext";
import { STORAGE_KEYS } from "../utilities/activeTabs";
import { can } from "../utilities/can";
import { TableVirtuoso } from "react-virtuoso";

export default function GetAllMaterialRequest() {
	const { userToken, setPageLoading } = useAuth();
	const navigate = useNavigate();

	const [activeTab, setActiveTab] = useState(() => {
		const savedTab = localStorage.getItem(STORAGE_KEYS.MATERIAL_REQUESTS.ACTIVE_TAB);

		// Validate value (prevents corrupted storage bugs)
		if (["waiting", "approved", "denied"].includes(savedTab)) {
			return savedTab;
		}

		return "waiting";
	});

	const decodedUser = useMemo(() => {
		if (!userToken) return null;
		try {
			return JSON.parse(atob(userToken.split(".")[1])); // simple JWT decode
		} catch (err) {
			console.error("Invalid token", err);
			return null;
		}
	}, [userToken]);

	const canUserReview = useMemo(() => {
		if (!decodedUser) return false;

		const role = typeof decodedUser.role === "string" ? decodedUser.role : decodedUser.role?.role;

		// const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
		// can(decodedUser,"items:read:any")
		// const isOwner = decodedUser.userId === userId;

		// return hasRole;
		// return can(decodedUser, "items:read:any");
		return can(decodedUser, "requests:read:any") || can(decodedUser, "requests:read:own", { ownerId: decodedUser.userId });
	}, [decodedUser]);

	useEffect(() => {
		if (!canUserReview) {
			navigate(`/user/${decodedUser.userId}`, { replace: true });
		}
	}, [canUserReview, navigate, decodedUser]);

	useEffect(() => {}, [activeTab]);

	const filterByTab = (list, tab) => {
		switch (tab) {
			case "approved":
				return list.filter((req) => req?.approvalStatus?.isApproved === true);

			case "waiting":
				return list.filter((req) => req?.approvalStatus?.isApproved === null);

			case "denied":
				return list.filter((req) => req?.approvalStatus?.isApproved === false);

			// case "all":
			default:
				return list;
		}
	};

	// Sorting storage keys
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

	console.log("this is the request", mRequests);

	const [searchValue, setSearchValue] = useState("");

	const { t } = useTranslation();

	// Fetch and set requests
	useEffect(() => {
		setPageLoading(loading);
	}, [loading, setPageLoading]);
	// }, [data, loading, setPageLoading]);

	// Fuse.js fuzzy search
	const applyFuse = (list, search) => {
		if (!search) return list;
		const fuse = new Fuse(list, {
			keys: ["requester.name", "requester.email", "requester.employeeNum", "requester.department"],
			threshold: 0.4,
		});
		return fuse.search(search).map((r) => r.item);
	};

	const filteredMRequests = React.useMemo(() => {
		const tabFiltered = filterByTab(mRequests, activeTab);

		const searched = searchValue ? applyFuse(tabFiltered, searchValue) : tabFiltered;

		return sortRequests(searched, sortKey, sortDir);
	}, [mRequests, searchValue, activeTab, sortKey, sortDir]);

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

	const formatDate = (date) => {
		if (!date) return "N/A";
		const parsedDate = isNaN(Number(date)) ? dayjs(date) : dayjs(Number(date));
		return parsedDate.isValid() ? parsedDate.format("YYYY-MM-DD") : "N/A";
	};

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

					{/* Tabs */}

					{/* Table */}
					<div className="table-wrapper">
						<div className="table-title">
							<div className="table-title-inner">
								{/* <h2>{t("material-requests")}</h2> */}
								{/* <h2>Requests</h2> */}

								<div className="tabs-wrapper-filter-btn">
									{/*!!! add  add translations*/}

									<button
										// className={`tab-btn ${activeTab === "approved" ? "active" : ""}`}
										className={`filter-btn ${activeTab === "approved" ? "selected-filter" : ""}`}
										onClick={() => setActiveTab("approved")}>
										Approved
									</button>

									<button
										//  className={`     tab-btn  ${activeTab === "waiting" ? "active" : ""}`}
										className={`filter-btn  ${activeTab === "waiting" ? "selected-filter" : ""}`}
										onClick={() => setActiveTab("waiting")}>
										Waiting
									</button>

									<button
										// className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
										className={`filter-btn ${activeTab === "denied" ? "selected-filter" : ""}`}
										onClick={() => setActiveTab("denied")}>
										Denied
									</button>
								</div>
							</div>
						</div>

						{/* <div className="table-scroll"> */}
						<TableVirtuoso
							style={{
								height: "95%",
								// backgroundColor: "green",
							}}
							className="Table-Virtuoso"
							data={filteredMRequests} // HEADER
							fixedHeaderContent={() => (
								<tr>
									{jwtDecode(userToken)?.role == "headAdmin" && <th>ID</th>}

									<th onClick={() => handleSort("employeeNum")} className={`clickable-th ${sortKey === "employeeNum" ? "active-sort" : ""}`}>
										# {sortKey === "employeeNum" && (sortDir === "asc" ? "▾" : "▴")}
									</th>

									<th onClick={() => handleSort("requesterName")} className={`clickable-th ${sortKey === "requesterName" ? "active-sort" : ""}`}>
										{t("requestors-name")} {sortKey === "requesterName" && (sortDir === "asc" ? "▾" : "▴")}
									</th>

									<th onClick={() => handleSort("addedDate")} className={`clickable-th ${sortKey === "addedDate" ? "active-sort" : ""}`}>
										{t("requested-date")} {sortKey === "addedDate" && (sortDir === "asc" ? "▾" : "▴")}
									</th>

									<th>{t("approval")}</th>
									<th>{t("description")}</th>

									<th>{t("action")}</th>
								</tr>
							)}
							// ROWS -/ td
							itemContent={(index, request) => (
								<>
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
									{/* <td>{request?.description}</td> */}
									<td>{request?.items[0]?.itemDescription}</td>

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
								</>
							)}
						/>
					</div>
					{/* </div> */}
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}

// <table>
// 	<thead>
// 		<tr>
// 			{jwtDecode(userToken)?.role == "headAdmin" && <th>ID</th>}

// 			<th onClick={() => handleSort("employeeNum")} className={`clickable-th ${sortKey === "employeeNum" ? "active-sort" : ""}`}>
// 				# {sortKey === "employeeNum" && (sortDir === "asc" ? "▾" : "▴")}
// 			</th>

// 			<th onClick={() => handleSort("requesterName")} className={`clickable-th ${sortKey === "requesterName" ? "active-sort" : ""}`}>
// 				{t("requestors-name")} {sortKey === "requesterName" && (sortDir === "asc" ? "▾" : "▴")}
// 			</th>

// 			<th onClick={() => handleSort("addedDate")} className={`clickable-th ${sortKey === "addedDate" ? "active-sort" : ""}`}>
// 				{t("requested-date")} {sortKey === "addedDate" && (sortDir === "asc" ? "▾" : "▴")}
// 			</th>

// 			<th>{t("approval")}</th>
// 			<th>{t("description")}</th>

// 			<th>{t("action")}</th>
// 		</tr>
// 	</thead>
// 	<tbody>
// 		{filteredMRequests.length !== 0 ? (
// 			filteredMRequests.map((request) => (
// 				<tr key={request?.id}>
// 					{jwtDecode(userToken)?.role == "headAdmin" && (
// 						<td>
// 							<Link to={`/material/request/${request?.id}`}>{request?.id}</Link>
// 						</td>
// 					)}
// 					<td>
// 						<Link to={`/material/request/${request?.id}`}>{request?.requester?.employeeNum ? request?.requester?.employeeNum : "N/A"}</Link>
// 					</td>
// 					<td>
// 						<Link to={`/material/request/${request?.id}`}>{request?.requester?.name}</Link>
// 					</td>
// 					<td>{formatDate(request?.addedDate)}</td>

// 					<td>
// 						<p className={`${request?.approvalStatus?.isApproved === null ? "waiting-approval" : request?.approvalStatus?.isApproved === true ? "approved" : "denied"}`}>{request?.approvalStatus?.isApproved === null ? t("waiting-for-approval") : request?.approvalStatus?.isApproved === true ? t("Approved") : t("Denied")}</p>
// 					</td>
// 					{/* <td>{request?.description}</td> */}
// 					<td>{request?.items[0]?.itemDescription}</td>

// 					{/* <td>{dayjs(Number(request?.addedDate)).format("YYYY-MM-DD")}</td> */}

// 					{/* <td>{request?.items?.length}</td> */}
// 					<td>
// 						<div className="table-action-wrapper">
// 							{canReview() ? (
// 								<Link to={`/material/request/${request?.id}/update`}>
// 									<span className="table-action first">{t("review")}</span>
// 								</Link>
// 							) : request?.approvalStatus?.isApproved === null ? (
// 								<Link to={`/material/request/${request?.id}/update`}>
// 									<span className="table-action first">{t("update request")}</span>
// 								</Link>
// 							) : (
// 								<Link to={`/material/request/${request?.id}`}>
// 									<span className="table-action second">{t("view")}</span>
// 								</Link>
// 							)}
// 						</div>
// 					</td>
// 				</tr>
// 			))
// 		) : (
// 			<tr>
// 				<td colSpan={7} style={{ textAlign: "center" }}>
// 					<h1>N/A</h1>
// 				</td>
// 			</tr>
// 		)}
// 	</tbody>
// </table>
