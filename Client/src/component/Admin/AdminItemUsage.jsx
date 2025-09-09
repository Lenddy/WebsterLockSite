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

	// 🔹 Filter requests by time range
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

	return (
		<div>
			<h1>Welcome {logUser?.name}</h1>

			{/* Filter controls */}
			<div style={{ marginBottom: "1rem" }}>
				{["all", "day", "week", "month", "year"].map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						style={{
							fontWeight: filter === f ? "bold" : "normal",
							marginRight: "8px",
						}}>
						{f}
					</button>
				))}

				{/* Custom date filter */}
				<div style={{ marginTop: "1rem" }}>
					<label>
						Start:{" "}
						<input
							type="date"
							value={customStart}
							onChange={(e) => {
								setCustomStart(e.target.value);
								setFilter("custom");
							}}
						/>
					</label>
					<label style={{ marginLeft: "1rem" }}>
						End:{" "}
						<input
							type="date"
							value={customEnd}
							onChange={(e) => {
								setCustomEnd(e.target.value);
								setFilter("custom");
							}}
						/>
					</label>
					<button
						onClick={clearFilters}
						style={{
							marginLeft: "1rem",
							background: "#eee",
							border: "1px solid #ccc",
							cursor: "pointer",
						}}>
						Clear Filter
					</button>
				</div>
			</div>

			{/* Aggregated results */}
			{loading ? (
				<h2>Loading...</h2>
			) : (
				<table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
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
			)}

			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</div>
	);
}
