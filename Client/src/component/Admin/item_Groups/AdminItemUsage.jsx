import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_material_requests } from "../../../../graphQL/queries/queries";
import { Link, useNavigate } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useTranslation } from "react-i18next";
dayjs.extend(isBetween);
import { useMaterialRequests } from "../../../context/MaterialRequestContext";
import { useAuth } from "../../../context/AuthContext";

export default function AdminItemUsage() {
	const { userToken, setPageLoading, setWsDisconnected } = useAuth(); // get token from context
	// const { error, loading, data } = useQuery(get_all_material_requests);
	const [mRequests, setMRequests] = useState([]);
	const { requests: allMRequests, loading, error } = useMaterialRequests();

	const [filter, setFilter] = useState("all"); // all | day | week | month | year | custom
	const [customStart, setCustomStart] = useState(""); // YYYY-MM-DD
	const [customEnd, setCustomEnd] = useState(""); // YYYY-MM-DD
	const [searchValue, setSearchValue] = useState("");

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
			console.error("Subscription error:", err);
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

		// console.log("Filter:", filter);
		// console.log("Start:", start?.format("YYYY-MM-DD HH:mm:ss"));
		// console.log("End:", end?.format("YYYY-MM-DD HH:mm:ss"));

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
						<table>
							<thead>
								<tr>
									<th>{t("item-name")}</th>
									<th>{t("total-used")}</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(finalUsage).map(([name, total]) => (
									<tr key={name}>
										<td>
											{/* on click make this go to a page that show  the users that have requested this material and also  allow them to bi filter by name and by date */}
											{/* /material/item/${name} */}
											<Link to={`/admin/material/item/usage/${encodeURIComponent(name)}`} onClick={() => console.log(name)}>
												{name}
											</Link>
										</td>
										<td>{total}</td>
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
