import { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_item_groups } from "../../../../graphQL/queries/queries";
import { ITEM_GROUP_CHANGE_SUBSCRIPTION } from "../../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import { useAuth } from "../../../context/AuthContext"; // use context
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import Modal from "../../Modal";

export default function AdminGetAllItems() {
	const { userToken } = useAuth(); // get token from context

	const [items, setItems] = useState([]);
	const [filteredItems, setFilteredItems] = useState([]);
	const [logUser, setLogUser] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const [searchValue, setSearchValue] = useState("");
	const { error, loading, data, refetch } = useQuery(get_all_item_groups);
	// { fetchPolicy: "cache-and-network" }

	// Decode token once when component mounts or token changes
	useEffect(() => {
		if (userToken) {
			try {
				const decoded = jwtDecode(userToken);
				setLogUser(decoded);
			} catch (err) {
				console.error("Failed to decode token:", err.message);
			}
		}
	}, [userToken]);

	// Helper function to sort alphabetically by brand
	const sortByBrand = (list) => {
		return [...list].sort((a, b) => {
			if (!a.brand) return 1;

			if (!b.brand) return -1;

			return a.brand.toLowerCase().localeCompare(b.brand.toLowerCase());
		});
	};

	// Load data when query completes
	useEffect(() => {
		if (data?.getAllItemGroups) {
			const sorted = sortByBrand(data.getAllItemGroups);
			setItems(sorted);
			setFilteredItems(sorted);
		}
		if (error) console.error("Error fetching item groups:", error);
	}, [data, error]);

	// Update subscription to apply sorting
	useSubscription(ITEM_GROUP_CHANGE_SUBSCRIPTION, {
		onError: (err) => console.error("Subscription error:", err),

		onData: ({ data }) => {
			const change = data?.data?.onItemGroupChange;

			if (!change) return;

			const { eventType, Changes } = change;

			setItems((prev) => {
				let updated;

				if (eventType === "created") updated = [...prev, Changes];
				else if (eventType === "updated") updated = prev.map((ig) => (ig.id === Changes.id ? Changes : ig));
				else if (eventType === "deleted") updated = prev.filter((ig) => ig.id !== Changes.id);
				else updated = prev;

				const sorted = sortByBrand(updated);

				if (searchValue) setFilteredItems(applyFuse(sorted, searchValue));
				else setFilteredItems(sorted);

				return updated;
			});
		},
	});

	// Fuse.js search function
	const applyFuse = (list, search) => {
		if (!search) return list;
		const fuse = new Fuse(list, { keys: ["brand"], threshold: 0.4 });
		return fuse.search(search).map((r) => r.item);
	};

	// Update search handlers to sort search results alphabetically
	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		const filtered = applyFuse(items, val);
		setFilteredItems(sortByBrand(filtered));
	};

	const clearSearch = () => {
		setSearchValue("");
		setFilteredItems(sortByBrand(items));
	};

	if (!logUser) return null; // wait until token is decoded

	return (
		<>
			{loading ? (
				<div>
					<h1>Loading...</h1>
				</div>
			) : (
				<div className="list-get-all-content">
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search Brand by Brand Name" value={searchValue} onChange={handleSearchChange} autoComplete="off" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					<div className="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>ID</th>
									<th>Brand</th>
									<th>Item amount</th>
									<th>Some items</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((ig) => (
									<tr key={ig.id}>
										<td>
											<Link to={`/admin/material/item/${ig?.id}`}>{ig?.id}</Link>
										</td>
										<td>
											<Link to={`/admin/material/item/${ig?.id}`}>{ig?.brand}</Link>
										</td>
										<td>{ig?.itemsList?.length}</td>
										<td>
											{ig?.itemsList?.slice(0, 3).map((item, idx, arr) => (
												<span key={item.id}>
													{item.itemName}
													{idx < arr.length - 1 ? ", " : ""}
												</span>
											))}
										</td>
										<td>
											<div>
												<Link to={`/admin/material/item/${ig?.id}/update`}>
													<span className="table-action first">Update</span>
												</Link>
												{/* Uncomment for delete modal */}
												{/* <span className="table-action last" onClick={() => { setSelectedItem(ig); setIsOpen(true); }}>Delete</span> */}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{/* <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={selectedItem} userToken={userToken} /> */}
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}
