import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";

export default function AdminItemUsage() {
	const { error, loading, data } = useQuery(get_all_material_requests);
	const [mRequests, setMRequests] = useState([]);

	const [filter, setFilter] = useState("all"); // all | day | week | month | year | custom
	const [customStart, setCustomStart] = useState(""); // YYYY-MM-DD
	const [customEnd, setCustomEnd] = useState(""); // YYYY-MM-DD
	const [searchValue, setSearchValue] = useState("");

	useEffect(() => {
		if (data) setMRequests(data.getAllMaterialRequests);
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
		if (filter === "All") return mRequests;

		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

		return mRequests.filter((req) => {
			if (!req.addedDate) return false;
			const addedDate = new Date(Number(req.addedDate));

			switch (filter) {
				case "Day": {
					// Match today's full 24 hours
					return addedDate >= startOfDay && addedDate < endOfDay;
				}
				case "Week": {
					const startOfWeek = new Date(now);
					startOfWeek.setDate(now.getDate() - 7);
					return addedDate >= startOfWeek && addedDate <= now;
				}
				case "Month": {
					const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
					const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
					return addedDate >= startOfMonth && addedDate <= endOfMonth;
				}
				case "Year": {
					const startOfYear = new Date(now.getFullYear(), 0, 1);
					const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
					return addedDate >= startOfYear && addedDate <= endOfYear;
				}
				case "custom": {
					if (!customStart && !customEnd) return true;
					let start = customStart ? new Date(customStart) : null;
					let end = customEnd ? new Date(customEnd) : null;

					if (start) start.setHours(0, 0, 0, 0);
					if (end) end.setHours(23, 59, 59, 999);

					if (start && end) return addedDate >= start && addedDate <= end;
					if (start) return addedDate >= start;
					if (end) return addedDate <= end;
					return true;
				}
				default:
					return true;
			}
		});
	}, [mRequests, filter, customStart, customEnd]);

	//  Fuse.js search
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
											<Link to={`/material/item/${name}`}>{name}</Link>
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
