import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { get_one_item_group } from "../../../graphQL/queries/queries";
import { Link, useParams } from "react-router-dom";
import { ITEM_GROUP_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";

export default function AdminGetOneItem({ userToken }) {
	const [itemGroup, setItemGroup] = useState(null); // the full group (brand + itemsList)
	const [filteredItems, setFilteredItems] = useState([]); // only items
	const [searchValue, setSearchValue] = useState("");
	const [logUser, setLogUser] = useState({});
	const { itemId } = useParams();

	const { error, loading, data } = useQuery(get_one_item_group, {
		variables: { id: itemId },
	});

	// Helper function to sort items alphabetically by itemName
	const sortByItemName = (list) => {
		return [...list].sort((a, b) => {
			if (!a.itemName) return 1;
			if (!b.itemName) return -1;
			return a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase());
		});
	};

	//  Decode token
	useEffect(() => {
		const token = localStorage.getItem("UserToken");
		if (token) setLogUser(jwtDecode(token));
	}, []);

	//  Update items when query data changes
	// useEffect(() => {
	// 	if (data?.getOneItemGroup) {
	// 		const group = data.getOneItemGroup;
	// 		setItemGroup(group);
	// 		setFilteredItems(group.itemsList || []);
	// 	}
	// }, [data]);

	// Update useEffect for query data
	useEffect(() => {
		if (data?.getOneItemGroup) {
			const group = data.getOneItemGroup;
			setItemGroup(group);
			setFilteredItems(sortByItemName(group.itemsList || []));
		}
	}, [data]);

	//  Subscription for live updates
	// useSubscription(ITEM_GROUP_CHANGE_SUBSCRIPTION, {
	// 	onError: (err) => console.error("Subscription error:", err),
	// 	onData: ({ data }) => {
	// 		const change = data?.data?.onItemGroupChange;
	// 		if (!change) return;

	// 		const { eventType, Changes } = change;

	// 		// If this is the group we’re currently viewing, update it
	// 		if (Changes.id === itemId) {
	// 			let updatedGroup = { ...itemGroup };

	// 			if (eventType === "updated") updatedGroup = Changes;
	// 			else if (eventType === "deleted") updatedGroup = null;

	// 			setItemGroup(updatedGroup);
	// 			setFilteredItems(updatedGroup?.itemsList || []);
	// 		}
	// 	},
	// });

	// Update subscription to sort live updates
	useSubscription(ITEM_GROUP_CHANGE_SUBSCRIPTION, {
		onError: (err) => console.error("Subscription error:", err),
		onData: ({ data }) => {
			const change = data?.data?.onItemGroupChange;
			if (!change) return;

			const { eventType, Changes } = change;

			if (Changes.id === itemId) {
				let updatedGroup = { ...itemGroup };

				if (eventType === "updated") updatedGroup = Changes;
				else if (eventType === "deleted") updatedGroup = null;

				setItemGroup(updatedGroup);
				setFilteredItems(sortByItemName(updatedGroup?.itemsList || []));
			}
		},
	});

	//  Fuse.js search
	const applyFuse = (list, search) => {
		if (!search) return list;

		const fuse = new Fuse(list, {
			keys: ["itemName"],
			threshold: 0.4,
		});

		return fuse.search(search).map((r) => r.item);
	};

	//  Handle input change
	// const handleSearchChange = (e) => {
	// 	const val = e.target.value;
	// 	setSearchValue(val);
	// 	setFilteredItems(applyFuse(itemGroup?.itemsList || [], val));
	// };

	// Update search handlers to sort results alphabetically
	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		const filtered = applyFuse(itemGroup?.itemsList || [], val);
		setFilteredItems(sortByItemName(filtered));
	};

	//  Clear search
	// const clearSearch = () => {
	// 	setSearchValue("");
	// 	setFilteredItems(itemGroup?.itemsList || []);
	// };

	const clearSearch = () => {
		setSearchValue("");
		setFilteredItems(sortByItemName(itemGroup?.itemsList || []));
	};

	//  Render
	if (loading) return <h1>Loading...</h1>;
	if (error) return <p style={{ color: "red" }}>{error.message}</p>;
	if (!itemGroup) return <h2>No item group found.</h2>;

	return (
		<div className="list-get-all-content">
			{/* <h2>Brand: {itemGroup.brand}</h2> */}

			<div className="search-filter-wrapper">
				<div className="search-filter-container">
					<input type="text" className="search-filter-input" placeholder="Search items by name..." value={searchValue} onChange={handleSearchChange} autoComplete="off" />
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
							<th>Item Name</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{filteredItems.map((it) => (
							<tr key={it.id}>
								<td>{it.id}</td>
								<td>{it.itemName}</td>
								<td>
									<div className="table-action-wrapper">
										<Link to={`/admin/material/item/${itemId}/update`}>
											<span className="table-action first">Update</span>
										</Link>
										<Link to={`/admin/material/item/${itemId}/update`}>
											<span className="table-action last">Delete</span>
										</Link>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// import React, { useEffect, useState } from "react";
// import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
// import { jwtDecode } from "jwt-decode";
// import { get_one_item_group } from "../../../graphQL/queries/queries";
// import { Link, useParams, useLocation } from "react-router-dom";
// import { ITEM_GROUP_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
// import Modal from "../Modal";
// import Fuse from "fuse.js";

// export default function AdminGetOneItem({ userToken }) {
// 	const [item, setItem] = useState([]);
// 	const [logUser, setLogUser] = useState({});
// 	const { itemId } = useParams();
// 	const { error, loading, data, refetch } = useQuery(get_one_item_group, { variables: { id: itemId } });
// 	// const decoded = ;
// 	const [isOpen, setIsOpen] = useState(false);

// 	const [selectedItem, setSelectedItem] = useState(null);

// 	const [searchValue, setSearchValue] = useState(""); // persistent search
// 	const [filteredItems, setFilteredItems] = useState([]);
// 	const [items, setItems] = useState([]);

// 	useEffect(() => {
// 		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
// 		if (loading) {
// 			console.log("loading");
// 		}
// 		if (data) {
// 			console.log(data?.getOneItemGroup);
// 			setItem(data?.getOneItemGroup);
// 			setFilteredItems(data?.getOneItemGroup);
// 		}
// 		if (error) {
// 			console.log("there was an error", error);
// 		}
// 	}, [loading, data, error]); //refetch
// 	// // Subscription for client changes

// 	// Live subscription for item group updates
// 	useSubscription(ITEM_GROUP_CHANGE_SUBSCRIPTION, {
// 		onError: (err) => console.error("Subscription error:", err),
// 		onData: ({ data }) => {
// 			const change = data?.data?.onItemGroupChange;
// 			if (!change) return;

// 			const { eventType, Changes } = change;

// 			setItems((prev) => {
// 				let updated;
// 				if (eventType === "created") updated = [...prev, Changes];
// 				else if (eventType === "updated") updated = prev.map((ig) => (ig.id === Changes.id ? Changes : ig));
// 				else if (eventType === "deleted") updated = prev.filter((ig) => ig.id !== Changes.id);
// 				else updated = prev;

// 				// Reapply current filter
// 				if (searchValue) setFilteredItems(applyFuse(updated, searchValue));
// 				else setFilteredItems(updated);

// 				return updated;
// 			});
// 		},
// 	});

// 	// Fuse.js search function
// 	const applyFuse = (list, search) => {
// 		if (!search) return list;
// 		console.log("this is the list ", list);

// 		const fuse = new Fuse(list, {
// 			keys: ["itemsList"],
// 			threshold: 0.4,
// 		});

// 		console.log("this is fuse ", fuse);

// 		return fuse.search(search).map((r) => r.itemName);
// 	};

// 	// Handle input change
// 	const handleSearchChange = (e) => {
// 		const val = e.target.value;
// 		setSearchValue(val);
// 		setFilteredItems(applyFuse(item, val));
// 	};

// 	// Clear search manually
// 	const clearSearch = () => {
// 		setSearchValue("");
// 		setFilteredItems(item);
// 	};

// 	console.log("this is the selected item", selectedItem);

// 	return (
// 		<>
// 			{/* {/*  */}
// 			{loading ? (
// 				<div>
// 					<h1>loading...</h1>
// 				</div>
// 			) : (
// 				<div className="list-get-all-content">
// 					<div className="search-filter-wrapper">
// 						<div className="search-filter-container">
// 							<input type="text" className="search-filter-input" placeholder="Search Brand by Brand Name" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
// 							<button
// 								className="search-clear-btn"
// 								onClick={clearSearch}
// 								disabled={!searchValue} // disabled when input is empty
// 							>
// 								✕
// 							</button>
// 						</div>
// 					</div>

// 					<div className="table-wrapper">
// 						<table>
// 							<thead>
// 								<tr>
// 									<th>ID</th>
// 									<th>Item Name</th>
// 									<th>Action</th>
// 								</tr>
// 							</thead>

// 							<tbody>
// 								{filteredItems?.itemsList?.map((item) => {
// 									return (
// 										<tr key={item.id}>
// 											<td>{item.id}</td>
// 											<td>{item.itemName}</td>
// 											<td>
// 												<div className="table-action-wrapper">
// 													{" "}
// 													<Link to={`/admin/material/item/${itemId}/update`}>
// 														<span className="table-action first">Update</span>
// 													</Link>
// 													<Link to={`/admin/material/item/${itemId}/update`}>
// 														<span
// 															className="table-action last"
// 															// onClick={() => {
// 															// 	setSelectedItem(item);
// 															// 	setIsOpen(true);
// 															// }}
// 														>
// 															delete
// 														</span>
// 													</Link>
// 												</div>
// 											</td>
// 										</tr>
// 									);
// 								})}
// 							</tbody>
// 						</table>
// 					</div>
// 					{/* <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={{ brandId: itemId, item: selectedItem }} userToken={userToken} /> */}
// 				</div>
// 			)}
// 			{error && <p style={{ color: "red" }}> {error.message}</p>}
// 		</>
// 	);
// }
