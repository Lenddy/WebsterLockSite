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

export default function GetAllMaterialRequest() {
	const { userToken, setPageLoading } = useAuth();
	const { error, loading, data } = useQuery(get_all_material_requests, {
		fetchPolicy: "cache-and-network",
	});

	const [mRequests, setMRequests] = useState([]);
	const [searchValue, setSearchValue] = useState("");

	const { t } = useTranslation();

	// Fetch and set requests
	useEffect(() => {
		setPageLoading(loading);

		if (data?.getAllMaterialRequests) {
			console.log("requests", data?.getAllMaterialRequests);
			setMRequests(data.getAllMaterialRequests);
		}
	}, [data, loading, setPageLoading]);

	//  New improved sorting function
	const sortRequests = (arr) => {
		const today = dayjs().startOf("day");

		return [...arr].sort((a, b) => {
			const aApproved = a?.approvalStatus?.isApproved ? 1 : 0;
			const bApproved = b?.approvalStatus?.isApproved ? 1 : 0;

			const aDate = dayjs(a?.addedDate);
			const bDate = dayjs(b?.addedDate);

			const aIsFutureOrToday = aDate.isSame(today, "day") || aDate.isAfter(today);
			const bIsFutureOrToday = bDate.isSame(today, "day") || bDate.isAfter(today);

			// 1️ Date ≥ today should come first
			if (aIsFutureOrToday && !bIsFutureOrToday) return -1;
			if (!aIsFutureOrToday && bIsFutureOrToday) return 1;

			// 2️ Waiting (unapproved) should come before approved
			if (aApproved !== bApproved) return aApproved - bApproved;

			// 3️ Sort by newest date first
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

	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData, client }) => {
			console.log("📡 Subscription raw data:", subscriptionData);

			const changeEvent = subscriptionData?.data?.onMaterialRequestChange;
			console.log("before the return ");
			console.log("this is the change event", changeEvent);
			if (!changeEvent) return;
			console.log("after the return ");

			// const { eventType, changeType, change: singleChange, changes: multipleChanges } = changeEvent;
			const { eventType, changeType, change, changes } = changeEvent;
			console.warn("this is event type", eventType);
			console.warn("this is change type", changeType);
			console.warn("this is singe change", change);
			console.warn("this is multiple changes", changes);
			// Normalize into an array — so downstream logic doesn’t have to care
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			console.log("this is normalize", changesArray);

			console.warn("before the check of of change array length");
			if (!changesArray.length) return;
			console.warn("after the check of of change array length");

			console.log(`📡 Material Request subscription event: ${eventType}, changeType: ${changeType}, count: ${changesArray.length}`);

			// --- Update state ---
			setMRequests((prevRequests) => {
				let updated = [...prevRequests];

				for (const Changes of changesArray) {
					if (eventType === "created") {
						const exists = prevRequests.some((r) => r.id === Changes.id);
						if (!exists) {
							updated = [...updated, Changes];
						}
					} else if (eventType === "updated") {
						updated = updated.map((req) => {
							if (req.id !== Changes.id) return req;

							const existingItems = req.items || [];
							const updatedItems = (Changes.items || []).map((newItem) => {
								const index = existingItems.findIndex((i) => i.id === newItem.id);
								if (index > -1) return { ...existingItems[index], ...newItem };
								return newItem;
							});

							const remainingItems = existingItems.filter((i) => !updatedItems.some((u) => u.id === i.id));

							return { ...req, items: [...remainingItems, ...updatedItems], ...Changes };
						});
					} else if (eventType === "deleted") {
						updated = updated.filter((req) => req.id !== Changes.id);
					}
				}

				return updated;
			});

			// --- Update Apollo Cache ---
			try {
				client.cache.modify({
					fields: {
						getAllMaterialRequests(existingRefs = [], { readField }) {
							let newRefs = [...existingRefs];

							for (const Changes of changesArray) {
								if (eventType === "deleted") {
									newRefs = newRefs.filter((ref) => readField("id", ref) !== Changes.id);
									continue;
								}

								const existingIndex = newRefs.findIndex((ref) => readField("id", ref) === Changes.id);

								if (existingIndex > -1 && eventType === "updated") {
									newRefs = newRefs.map((ref) =>
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
														}
													`,
											  })
											: ref
									);
								} else if (eventType === "created") {
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
											}
										`,
									});
									newRefs = [...newRefs, newRef];
								}
							}

							return newRefs;
						},
					},
				});
			} catch (cacheErr) {
				console.warn("⚠️ Cache update skipped:", cacheErr.message);
			}
		},

		onError: (err) => {
			console.error("🚨 Subscription error:", err);
		},
	});

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

	console.log("role", jwtDecode(userToken)?.role == "headAdmin");

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
												<p className={`${request?.approvalStatus?.isApproved ? "approved" : "waiting-approval"}`}>{request?.approvalStatus?.isApproved ? t("Approved") : t("waiting-for-approval")}</p>
											</td>
											<td>{dayjs(Number(request?.addedDate)).format("YYYY-MM-DD")}</td>
											<td>{request?.items?.length}</td>
											<td>
												<div className="table-action-wrapper">
													{canReview() ? (
														<Link to={`/material/request/${request?.id}/update`}>
															<span className="table-action first">{t("review")}</span>
														</Link>
													) : !request?.approvalStatus?.isApproved ? (
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
