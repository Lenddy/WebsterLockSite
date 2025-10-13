import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

// console.log("Filter:", filter);
// console.log("Start:", start?.format("YYYY-MM-DD HH:mm:ss"));
// console.log("End:", end?.format("YYYY-MM-DD HH:mm:ss"));

export default function AdminItemUsage() {
	const { error, loading, data } = useQuery(get_all_material_requests);
	const [mRequests, setMRequests] = useState([]);

	const [filter, setFilter] = useState("all"); // all | day | week | month | year | custom
	const [customStart, setCustomStart] = useState(""); // YYYY-MM-DD
	const [customEnd, setCustomEnd] = useState(""); // YYYY-MM-DD
	const [searchValue, setSearchValue] = useState("");

	useEffect(() => {
		if (data) {
			console.log(data.getAllMaterialRequests);
			setMRequests(data.getAllMaterialRequests);
		}
	}, [data]);

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
	});

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

		console.log("Filter:", filter);
		console.log("Start:", start?.format("YYYY-MM-DD HH:mm:ss"));
		console.log("End:", end?.format("YYYY-MM-DD HH:mm:ss"));

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

	//  Fuse.js searchs
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
					<h2>Loading...</h2>
				</div>
			) : (
				<div className="list-get-all-content item-usage-container">
					{/* Filter Buttons */}
					<div>
						<div className="filter-btn-container">
							{["All", "Day", "Week", "Month", "Year"].map((f) => (
								<button key={f} className={`filter-btn ${filter === f ? "selected-filter" : ""}`} disabled={filter === f} onClick={() => setFilter(f)}>
									{f}
								</button>
							))}
						</div>

						{/* Custom Date Filters */}
						<div className="date-custom-filter-container">
							<div className="date-custom-filter-wrapper-top">
								<div>
									<label>Start:</label>
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
									<label style={{ marginLeft: "1rem" }}>End:</label>
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
								Clear Filter
							</button>
						</div>
					</div>

					{/* Search Input */}
					<div className="search-filter-wrapper item-usage-filter">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search Item by Name" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
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
									<th>Item</th>
									<th>Total Used</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(finalUsage).map(([name, total]) => (
									<tr key={name}>
										<td>
											{/* on click make this go to a page that show  the users that have requested this material and also  allow them to bi filter by name and by date */}
											{/* /material/item/${name} */}
											<Link to={``}>{name}</Link>
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

// import React, { useEffect, useState, useMemo } from "react";
// import { useQuery, useSubscription } from "@apollo/client";
// import { jwtDecode } from "jwt-decode";
// import { get_all_material_requests } from "../../../graphQL/queries/queries";
// import { Link } from "react-router-dom";
// import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
// import Fuse from "fuse.js";

// export default function AdminItemUsage() {
// 	const { error, loading, data } = useQuery(get_all_material_requests);

// 	const [mRequests, setMRequests] = useState([]);

// 	const [filter, setFilter] = useState("all"); // all | day | week | month | year | custom

// 	const [customStart, setCustomStart] = useState(""); // YYYY-MM-DD

// 	const [customEnd, setCustomEnd] = useState(""); // YYYY-MM-DD

// 	const [selectedItem, setSelectedItem] = useState(null);

// 	const [searchValue, setSearchValue] = useState("");

// 	const [filteredItems, setFilteredItems] = useState([]);

// 	useEffect(() => {
// 		if (data) setMRequests(data.getAllMaterialRequests);
// 	}, [data]);

// 	// Live subscription
// 	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
// 		onData: ({ data: subscriptionData }) => {
// 			const change = subscriptionData?.data?.onMaterialRequestChange;
// 			if (!change) return;

// 			const { eventType, Changes } = change;

// 			setMRequests((prev) => {
// 				switch (eventType) {
// 					case "created":
// 						return [...prev, Changes];
// 					case "updated":
// 						return prev.map((req) => (req.id === Changes.id ? Changes : req));
// 					case "deleted":
// 						return prev.filter((req) => req.id !== Changes.id);
// 					default:
// 						return prev;
// 				}
// 			});
// 		},
// 	});

// 	//  Filter requests by time range
// 	const filteredRequests = useMemo(() => {
// 		if (filter === "All") return mRequests;

// 		const now = new Date();
// 		return mRequests.filter((req) => {
// 			if (!req.addedDate) return false;
// 			const addedDate = new Date(Number(req.addedDate));

// 			switch (filter) {
// 				case "Day":
// 					return addedDate.toDateString() === now.toDateString();
// 				case "Week": {
// 					const oneWeekAgo = new Date();
// 					oneWeekAgo.setDate(now.getDate() - 7);
// 					return addedDate >= oneWeekAgo;
// 				}
// 				case "Month":
// 					return addedDate.getMonth() === now.getMonth() && addedDate.getFullYear() === now.getFullYear();
// 				case "Year":
// 					return addedDate.getFullYear() === now.getFullYear();
// 				case "custom": {
// 					if (!customStart && !customEnd) return true;

// 					let start = customStart ? new Date(customStart) : null;
// 					let end = customEnd ? new Date(customEnd) : null;

// 					if (start) start.setHours(0, 0, 0, 0);
// 					if (end) end.setHours(23, 59, 59, 999);

// 					if (start && end) {
// 						return addedDate >= start && addedDate <= end;
// 					} else if (start) {
// 						return addedDate >= start;
// 					} else if (end) {
// 						return addedDate <= end;
// 					}
// 					return true;
// 				}
// 				default:
// 					return true;
// 			}
// 		});
// 	}, [mRequests, filter, customStart, customEnd]);

// 	// Aggregate item usage
// 	const itemUsage = useMemo(() => {
// 		const totals = {};
// 		filteredRequests.forEach((req) => {
// 			req.items.forEach((item) => {
// 				totals[item.itemName] = (totals[item.itemName] || 0) + item.quantity;
// 			});
// 		});
// 		return totals;
// 	}, [filteredRequests]);

// 	// Reset filters
// 	const clearFilters = () => {
// 		setCustomStart("");
// 		setCustomEnd("");
// 		setFilter("all");
// 	};

// 	const applyFuse = (list, search) => {
// 		if (!search) return list;

// 		const fuse = new Fuse(list, {
// 			keys: ["items"],
// 			threshold: 0.4,
// 		});

// 		return fuse.search(search).map((r) => r.item);
// 	};

// 	// Handle input change
// 	const handleSearchChange = (e) => {
// 		const val = e.target.value;
// 		setSearchValue(val);
// 		setFilteredItems(applyFuse(mRequests, val));
// 	};

// 	// Clear search manually
// 	const clearSearch = () => {
// 		setSearchValue("");
// 		setFilteredItems(mRequests);
// 	};

// 	console.log("all request", mRequests);

// 	return (
// 		<>
// 			{/* Filter controls */}

// 			{/* Aggregated results */}
// 			{loading ? (
// 				<div>
// 					<h2>Loading...</h2>
// 				</div>
// 			) : (
// 				<div className="list-get-all-content item-usage-container">
// 					<div>
// 						<div className="filter-btn-container">
// 							{["All", "Day", "Week", "Month", "Year"].map((f) => (
// 								<button key={f} className={`filter-btn ${filter === f ? "selected-filter" : ""}`} disabled={filter === f} onClick={() => setFilter(f)}>
// 									{f}
// 								</button>
// 							))}
// 						</div>

// 						<div className="date-custom-filter-container">
// 							<div className="date-custom-filter-wrapper-top">
// 								<div>
// 									<label>Start:</label>

// 									<input
// 										type="date"
// 										value={customStart}
// 										onChange={(e) => {
// 											setCustomStart(e.target.value);
// 											setFilter("custom");
// 										}}
// 									/>
// 								</div>

// 								<div>
// 									<label style={{ marginLeft: "1rem" }}>End:</label>
// 									<input
// 										type="date"
// 										value={customEnd}
// 										onChange={(e) => {
// 											setCustomEnd(e.target.value);
// 											setFilter("custom");
// 										}}
// 									/>
// 								</div>
// 							</div>

// 							<button className="filter-data-clear-btn" onClick={clearFilters}>
// 								Clear Filter
// 							</button>
// 						</div>
// 					</div>

// 					<div className="search-filter-wrapper item-usage-filter">
// 						<div className="search-filter-container">
// 							<input type="text" className="search-filter-input" placeholder="Search Brand by Brand Name" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
// 							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
// 								✕
// 							</button>
// 						</div>
// 					</div>
// 					<div className="table-wrapper">
// 						<table>
// 							<thead>
// 								<tr>
// 									<th>Item</th>
// 									<th>Total Used</th>
// 								</tr>
// 							</thead>
// 							<tbody>
// 								{Object.entries(itemUsage).map(([name, total]) => (
// 									<tr key={name}>
// 										<td>
// 											<Link to={`/material/item/${name}`}>{name}</Link>
// 										</td>
// 										<td>{total}</td>
// 									</tr>
// 								))}
// 							</tbody>
// 						</table>
// 					</div>
// 				</div>
// 			)}

// 			{error && <p style={{ color: "red" }}>{error.message}</p>}
// 		</>
// 	);
// }
