import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_material_requests } from "../../../../graphQL/queries/queries";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useTranslation } from "react-i18next";
dayjs.extend(isBetween);
import { useMaterialRequests } from "../../../context/MaterialRequestContext";
import { useAuth } from "../../../context/AuthContext";
// import { } from "react-router-dom";

export default function AdminItemUsage() {
	const { userToken, setPageLoading, setWsDisconnected } = useAuth(); // get token from context
	// const { error, loading, data } = useQuery(get_all_material_requests);
	const [mRequests, setMRequests] = useState([]);
	const { requests: allMRequests, loading, error } = useMaterialRequests();

	const [filter, setFilter] = useState("all"); // all | day | week | month | year | custom
	const [customStart, setCustomStart] = useState(""); // YYYY-MM-DD
	const [customEnd, setCustomEnd] = useState(""); // YYYY-MM-DD
	const [searchValue, setSearchValue] = useState("");
	const { itemName, userId } = useParams();

	console.log({ itemName, userId });

	const isItemView = !!itemName && !userId;
	const isUserView = !!itemName && !!userId;

	const { t } = useTranslation();
	const navigate = useNavigate();

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

		const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
		// const isOwner = decodedUser.userId === userId;

		return hasRole;
	}, [decodedUser]);

	useEffect(() => {
		if (!canUserReview) {
			navigate("/material/request/all", { replace: true });
		}
	}, [canUserReview, navigate]);

	useEffect(() => {
		if (allMRequests) {
			// console.log(data.getAllMaterialRequests);
			setMRequests(allMRequests);
		}
	}, [allMRequests]);

	//  Live subscription updates
	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			const change = subscriptionData?.data?.onMaterialRequestChange;
			if (!change) return;

			const { eventType, Changes } = change;

			setMRequests((prev) => {
				switch (eventType) {
					case "created":
						return [...prev, Changes];
					case "updated":
						return prev.map((req) => (req.id === Changes.id ? Changes : req));
					case "deleted":
						return prev.filter((req) => req.id !== Changes.id);
					default:
						return prev;
				}
			});
		},
		onError: (err) => {
			// console.error("Subscription error:", err);
			if (err?.message?.includes("Socket closed") || err?.networkError) {
				setWsDisconnected(true);
			}
		},
	});

	const translateFilterKey = (key) => {
		const keys = {
			All: "all",
			Today: "today",
			Week: "week",
			Month: "month",
			Year: "year",
		};
		// Use keys[key] if exists, otherwise fallback to the original key
		return t(keys[key] || key);
	};

	const filteredRequests = useMemo(() => {
		if (!mRequests?.length) return [];

		const now = dayjs();
		let start, end;

		switch (filter) {
			case "Day":
				start = now.startOf("day");
				end = now.endOf("day");
				break;

			case "Week":
				// Show current week (Monday–Sunday)
				start = now.startOf("week");
				end = now.endOf("week");
				break;

			case "Month":
				start = now.startOf("month");
				end = now.endOf("month");
				break;

			case "Year":
				start = now.startOf("year");
				end = now.endOf("year");
				break;

			case "custom":
				start = customStart ? dayjs(customStart).startOf("day") : null;
				end = customEnd ? dayjs(customEnd).endOf("day") : null;
				break;

			default:
				return mRequests; // "All" case
		}

		return mRequests.filter((req) => {
			if (!req.addedDate) return false;

			const addedDate = dayjs(Number(req.addedDate)); // DB timestamp

			if (filter === "custom") {
				if (start && end) return addedDate.isBetween(start, end, null, "[]");
				if (start) return addedDate.isAfter(start) || addedDate.isSame(start, "day");
				if (end) return addedDate.isBefore(end) || addedDate.isSame(end, "day");
				return true;
			}

			return addedDate.isBetween(start, end, null, "[]"); // inclusive
		});
	}, [mRequests, filter, customStart, customEnd]);

	//  Fuse.js searches
	const applyFuse = (list, search) => {
		if (!search) return list;

		// Flatten items for searching by item name
		const flatList = list.flatMap((req) =>
			req.items.map((item) => ({
				...item,
				requestId: req.id,
				addedDate: req.addedDate,
			}))
		);

		const fuse = new Fuse(flatList, {
			keys: ["itemName"],
			threshold: 0.4,
		});

		return fuse.search(search).map((r) => r.item);
	};

	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
	};

	const clearSearch = () => {
		setSearchValue("");
	};

	// Combine filters and search
	const finalUsage = useMemo(() => {
		let baseList = filteredRequests;

		// If search term exists → apply Fuse
		if (searchValue) {
			const searchedItems = applyFuse(filteredRequests, searchValue);
			const totals = {};
			searchedItems.forEach((item) => {
				totals[item.itemName] = (totals[item.itemName] || 0) + item.quantity;
			});
			return totals;
		}

		// Otherwise, aggregate normally
		const totals = {};
		baseList.forEach((req) => {
			req.items.forEach((item) => {
				totals[item.itemName] = (totals[item.itemName] || 0) + item.quantity;
			});
		});
		return totals;
	}, [filteredRequests, searchValue]);

	//  Clear filters
	const clearFilters = () => {
		setCustomStart("");
		setCustomEnd("");
		setFilter("all");
	};

	const usageData = useMemo(() => {
		if (!filteredRequests?.length) return [];

		// LEVEL 1
		if (!itemName) {
			const totals = {};
			filteredRequests.forEach((req) => {
				req.items.forEach((item) => {
					totals[item.itemName] = (totals[item.itemName] || 0) + item.quantity;
				});
			});
			return totals;
		}

		// LEVEL 2 → Group by USER for selected item
		if (itemName && !userId) {
			const totals = {};

			filteredRequests.forEach((req) => {
				req.items.forEach((item) => {
					if (item.itemName === itemName) {
						const userName = req.requester?.name;
						const uid = req.requester?.userId;

						if (!totals[uid]) {
							totals[uid] = {
								name: userName,
								total: 0,
							};
						}

						totals[uid].total += item.quantity;
					}
				});
			});

			return totals;
		}

		// LEVEL 3 → Individual entries
		if (itemName && userId) {
			const list = [];

			filteredRequests.forEach((req) => {
				if (req.requester?.userId !== userId) return;

				req.items.forEach((item) => {
					if (item.itemName === itemName) {
						list.push({
							name: req.requester?.name,
							quantity: item.quantity,
							date: req.addedDate,
						});
					}
				});
			});

			return list;
		}
	}, [filteredRequests, itemName, userId]);

	// const finalUsage = useMemo(() => {
	// 	let baseList = filteredRequests;
	// 	const totals = {};

	// 	baseList.forEach((req) => {
	// 		req.items.forEach((item) => {
	// 			if (!totals[item.id]) {
	// 				totals[item.id] = {
	// 					name: item.itemName,
	// 					total: 0,
	// 				};
	// 			}
	// 			totals[item.id].total += item.quantity;
	// 		});
	// 	});

	// 	return totals;
	// }, [filteredRequests]);

	{
		/* {!itemName && <th>{t("item-name")}</th>}
												{isItemView && <th>{t("name")}</th>}
												{isUserView && <th>{t("name")}</th>}

												{isUserView && <th>{t("date")}</th>}
												{!isUserView && <th>{t("total-used")}</th>}
												{isUserView && <th>{t("quantity")}</th>} */
	}

	// ! you need to find out why the url does not take the 2nd parameter

	return (
		<>
			{loading ? (
				<div>
					<h2>{t("loading")}</h2>
				</div>
			) : (
				<div className="list-get-all-content item-usage-container">
					{/* Filter Buttons */}
					<div>
						<div className="filter-btn-container">
							{["All", "Today", "Week", "Month", "Year"].map((f) => (
								<button key={f} className={`filter-btn ${filter === f ? "selected-filter" : ""}`} disabled={filter === f} onClick={() => setFilter(f)}>
									{/* {f} */}
									{translateFilterKey(f)}
								</button>
							))}
						</div>

						{/* Custom Date Filters */}
						<div className="date-custom-filter-container">
							<div className="date-custom-filter-wrapper-top">
								<div>
									<label>{t("start")}:</label>
									<input
										type="date"
										value={customStart}
										onChange={(e) => {
											setCustomStart(e.target.value);
											setFilter("custom");
										}}
									/>
								</div>

								<div>
									<label style={{ marginLeft: "1rem" }}>{t("end")}:</label>
									<input
										type="date"
										value={customEnd}
										onChange={(e) => {
											setCustomEnd(e.target.value);
											setFilter("custom");
										}}
									/>
								</div>
							</div>

							<button className="filter-data-clear-btn" onClick={clearFilters}>
								{t("clear-filter")}
							</button>
						</div>
					</div>

					{/* Search Input */}
					<div className="search-filter-wrapper item-usage-filter">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder={t("search-item-by-name")} value={searchValue} onChange={handleSearchChange} autoComplete="false" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					{/* Results Table */}
					<div className="table-wrapper">
						<div className="table-scroll">
							<table>
								<thead>
									<tr>
										{/* <th>{t("item-name")}</th>
										<th>{t("total-used")}</th> */}

										{/* <thead>
											<tr> */}
										{/* LEVEL 1 */}
										{!itemName && (
											<>
												<th>{t("item-name")}</th>
												<th>{t("total-used")}</th>
											</>
										)}
										{/* LEVEL 2 */}
										{isItemView && (
											<>
												<th>{t("name")}</th>
												<th>{t("total-used")}</th>
											</>
										)}
										{/* LEVEL 3 */}
										{isUserView && (
											<>
												<th>{t("name")}</th>
												<th>{t("quantity")}</th>
												<th>{t("date")}</th>
											</>
										)}
										{/* </tr>
										</thead> */}
									</tr>
								</thead>
								<tbody>
									{/* LEVEL 1 → Items */}
									{!itemName &&
										Object.entries(usageData || {}).map(([name, total]) => (
											<tr key={name}>
												<td>
													<Link to={`/admin/material/item/usage/${encodeURIComponent(name)}`}>{name}</Link>
												</td>
												<td>{total}</td>
											</tr>
										))}

									{/* LEVEL 2 → Users for that item */}
									{isItemView &&
										Object.entries(usageData || {}).map(([uid, data]) => (
											<tr key={uid}>
												<td>
													<Link to={`/admin/material/item/usage/${encodeURIComponent(itemName)}/${uid}`}>{data.name}</Link>
												</td>
												<td>{data.total}</td>
											</tr>
										))}

									{/* LEVEL 3 → Individual entries */}
									{isUserView &&
										(usageData || []).map((entry, index) => (
											<tr key={index}>
												<td>{entry.name}</td>
												<td>{entry.quantity}</td>
												<td>{dayjs(Number(entry.date)).format("YYYY-MM-DD")}</td>
											</tr>
										))}
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

// Object.entries(usageData).map(([name, total]) => (
//   <tr key={name}>
//     <td>
//       <Link to={`/admin/material/item/usage/${encodeURIComponent(name)}`}>
//         {name}
//       </Link>
//     </td>
//     <td>{total}</td>
//   </tr>
// ))
