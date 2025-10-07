import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { get_all_material_requests } from "../../../graphQL/queries/queries";
import { Link } from "react-router-dom";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";

export default function AdminItemUsage() {
	const { error, loading, data } = useQuery(get_all_material_requests);
	const [mRequests, setMRequests] = useState([]);
	const [logUser, setLogUser] = useState({});
	const [filter, setFilter] = useState("all"); // all | day | week | month | year | custom
	const [customStart, setCustomStart] = useState(""); // YYYY-MM-DD
	const [customEnd, setCustomEnd] = useState(""); // YYYY-MM-DD

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (data) setMRequests(data.getAllMaterialRequests);
	}, [data]);

	// Live subscription
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

	//  Filter requests by time range
	const filteredRequests = useMemo(() => {
		if (filter === "all") return mRequests;

		const now = new Date();
		return mRequests.filter((req) => {
			if (!req.addedDate) return false;
			const addedDate = new Date(Number(req.addedDate));

			switch (filter) {
				case "day":
					return addedDate.toDateString() === now.toDateString();
				case "week": {
					const oneWeekAgo = new Date();
					oneWeekAgo.setDate(now.getDate() - 7);
					return addedDate >= oneWeekAgo;
				}
				case "month":
					return addedDate.getMonth() === now.getMonth() && addedDate.getFullYear() === now.getFullYear();
				case "year":
					return addedDate.getFullYear() === now.getFullYear();
				case "custom": {
					if (!customStart && !customEnd) return true;

					let start = customStart ? new Date(customStart) : null;
					let end = customEnd ? new Date(customEnd) : null;

					if (start) start.setHours(0, 0, 0, 0);
					if (end) end.setHours(23, 59, 59, 999);

					if (start && end) {
						return addedDate >= start && addedDate <= end;
					} else if (start) {
						return addedDate >= start;
					} else if (end) {
						return addedDate <= end;
					}
					return true;
				}
				default:
					return true;
			}
		});
	}, [mRequests, filter, customStart, customEnd]);

	// 🔹 Aggregate item usage
	const itemUsage = useMemo(() => {
		const totals = {};
		filteredRequests.forEach((req) => {
			req.items.forEach((item) => {
				totals[item.itemName] = (totals[item.itemName] || 0) + item.quantity;
			});
		});
		return totals;
	}, [filteredRequests]);

	// 🔹 Reset filters
	const clearFilters = () => {
		setCustomStart("");
		setCustomEnd("");
		setFilter("all"); // reset to all
	};

	const [selectedItem, setSelectedItem] = useState(null);

	const [searchValue, setSearchValue] = useState(""); // persistent search
	const [filteredItems, setFilteredItems] = useState([]);

	const applyFuse = (list, search) => {
		if (!search) return list;

		const fuse = new Fuse(list, {
			keys: ["brand"],
			threshold: 0.4,
		});

		return fuse.search(search).map((r) => r.item);
	};

	// Handle input change
	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		setFilteredItems(applyFuse(items, val));
	};

	// Clear search manually
	const clearSearch = () => {
		setSearchValue("");
		setFilteredItems(items);
	};

	return (
		<>
			{/* Filter controls */}

			{/* Aggregated results */}
			{loading ? (
				<div>
					<h2>Loading...</h2>
				</div>
			) : (
				<div className="list-get-all-content item-usage-container">
					<div>
						<div className="filter-btn-container">
							{["all", "day", "week", "month", "year"].map((f) => (
								<button key={f} className={`filter-btn ${filter === f ? "selected-filter" : ""}`} disabled={filter === f} onClick={() => setFilter(f)}>
									{f}
								</button>
							))}
						</div>

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

							<button onClick={clearFilters}>Clear Filter</button>
						</div>
					</div>

					<div className="search-filter-wrapper item-usage-filter">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search Brand by Brand Name" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>
					<div className="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>Item</th>
									<th>Total Used</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(itemUsage).map(([name, total]) => (
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
