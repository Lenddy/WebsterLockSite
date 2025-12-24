import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_all_item_groups } from "../../../../graphQL/queries/queries";
import { ITEM_GROUP_CHANGE_SUBSCRIPTION } from "../../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import { useAuth } from "../../../context/AuthContext"; // use context
import { jwtDecode } from "jwt-decode";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../Modal";
import { useTranslation } from "react-i18next";
import { useItemGroups } from "../../../context/ItemGroupContext";

export default function AdminGetAllItems() {
	const { userToken, setPageLoading } = useAuth(); // get token from context

	// const [items, setItems] = useState([]);
	const [filteredItems, setFilteredItems] = useState([]);
	const [logUser, setLogUser] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const [searchValue, setSearchValue] = useState("");
	// const { error, loading, data, refetch } = useQuery(get_all_item_groups, { fetchPolicy: "cache-and-network" });
	// { fetchPolicy: "cache-and-network" }

	const { items, loading, error } = useItemGroups();

	const navigate = useNavigate();

	const { t } = useTranslation();

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

	// Decode token once when component mounts or token changes
	useEffect(() => {
		setPageLoading(loading);
		if (userToken) {
			try {
				const decoded = jwtDecode(userToken);
				setLogUser(decoded);
			} catch (err) {
				console.error("Failed to decode token:", err.message);
			}
		}
	}, [userToken, setPageLoading, loading]);

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
		// if (data?.getAllItemGroups) {
		// const sorted = sortByBrand(data.getAllItemGroups);
		// setItems(sorted);
		setFilteredItems(items);
		// }
		// if (error) console.error("Error fetching item groups:", error);
	}, [items]);
	// }, [data, error ]);

	// useEffect(() => {
	// 	if (data?.getAllItemGroups) {
	// 		const sorted = sortByBrand(data.getAllItemGroups);
	// 		setItems(sorted);
	// 		setFilteredItems(sorted);
	// 	}
	// 	if (error) console.error("Error fetching item groups:", error);
	// }, [data, error]);

	// Update subscription to apply sorting
	// useSubscription(ITEM_GROUP_CHANGE_SUBSCRIPTION, {
	// 	onError: (err) => console.error("Subscription error:", err),

	// 	onData: ({ data }) => {
	// 		const change = data?.data?.onItemGroupChange;

	// 		if (!change) return;

	// 		const { eventType, Changes } = change;

	// 		setItems((prev) => {
	// 			let updated;

	// 			if (eventType === "created") updated = [...prev, Changes];
	// 			else if (eventType === "updated") updated = prev.map((ig) => (ig.id === Changes.id ? Changes : ig));
	// 			else if (eventType === "deleted") updated = prev.filter((ig) => ig.id !== Changes.id);
	// 			else updated = prev;

	// 			const sorted = sortByBrand(updated);

	// 			if (searchValue) setFilteredItems(applyFuse(sorted, searchValue));
	// 			else setFilteredItems(sorted);

	// 			return updated;
	// 		});
	// 	},
	// });

	// useSubscription(ITEM_GROUP_CHANGE_SUBSCRIPTION, {
	// 	onData: ({ data: subscriptionData, client }) => {
	// 		console.log("📡 Subscription raw data:", subscriptionData);

	// 		const changeEvent = subscriptionData?.data?.onItemGroupChange;
	// 		if (!changeEvent) return;

	// 		const { eventType, changeType, change, changes } = changeEvent;

	// 		// Normalize payload into a uniform array
	// 		const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

	// 		if (!changesArray.length) return;

	// 		console.log(`📡 ItemGroup subscription event: ${eventType}, changeType: ${changeType}, count: ${changesArray.length}`);

	// 		// --- Update local state ---
	// 		setItems((prevItems) => {
	// 			let updated = [...prevItems];

	// 			for (const Changes of changesArray) {
	// 				if (eventType === "created") {
	// 					const exists = prevItems.some((ig) => ig.id === Changes.id);
	// 					if (!exists) updated = [...updated, Changes];
	// 				} else if (eventType === "updated") {
	// 					updated = updated.map((ig) => (ig.id === Changes.id ? { ...ig, ...Changes } : ig));
	// 				} else if (eventType === "deleted") {
	// 					updated = updated.filter((ig) => ig.id !== Changes.id);
	// 				}
	// 			}

	// 			// Apply sorting and search filtering
	// 			const sorted = sortByBrand(updated);

	// 			if (searchValue) setFilteredItems(applyFuse(sorted, searchValue));
	// 			else setFilteredItems(sorted);

	// 			return sorted;
	// 		});

	// 		// --- Optional: Apollo cache sync ---
	// 		/*
	// 	try {
	// 		client.cache.modify({
	// 			fields: {
	// 				getAllItemGroups(existingRefs = [], { readField }) {
	// 					let newRefs = [...existingRefs];

	// 					for (const Changes of changesArray) {
	// 						if (eventType === "deleted") {
	// 							newRefs = newRefs.filter(
	// 								(ref) => readField("id", ref) !== Changes.id
	// 							);
	// 							continue;
	// 						}

	// 						const existingIndex = newRefs.findIndex(
	// 							(ref) => readField("id", ref) === Changes.id
	// 						);

	// 						if (existingIndex > -1 && eventType === "updated") {
	// 							newRefs = newRefs.map((ref) =>
	// 								readField("id", ref) === Changes.id
	// 									? client.cache.writeFragment({
	// 											data: Changes,
	// 											fragment: gql`
	// 												fragment UpdatedItemGroup on ItemGroup {
	// 													id
	// 													brand
	// 													itemsList {
	// 														id
	// 														itemName
	// 														itemDescription
	// 													}
	// 												}
	// 											`,
	// 									  })
	// 									: ref
	// 							);
	// 						} else if (eventType === "created") {
	// 							const newRef = client.cache.writeFragment({
	// 								data: Changes,
	// 								fragment: gql`
	// 									fragment NewItemGroup on ItemGroup {
	// 										id
	// 										brand
	// 										itemsList {
	// 											id
	// 											itemName
	// 											itemDescription
	// 										}
	// 									}
	// 								`,
	// 							});
	// 							newRefs = [...newRefs, newRef];
	// 						}
	// 					}

	// 					return newRefs;
	// 				},
	// 			},
	// 		});
	// 	} catch (cacheErr) {
	// 		console.warn("⚠️ Cache update skipped:", cacheErr.message);
	// 	}
	// 	*/
	// 	},

	// 	onError: (err) => {
	// 		console.error("🚨 Subscription error:", err);
	// 	},
	// });

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
					<h1>{t("Loading")}</h1>
				</div>
			) : (
				<div className="list-get-all-content">
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder={t("search-brand-by-brand-name")} value={searchValue} onChange={handleSearchChange} autoComplete="off" />
							<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
								✕
							</button>
						</div>
					</div>

					<div className="table-wrapper">
						<div className="table-title">
							<h2>{t("items")}</h2>
						</div>
						<table>
							<thead>
								<tr>
									{logUser?.role == "headAdmin" && <th>ID</th>}
									<th>{t("brand")}</th>
									<th>{t("item-amount")}</th>
									<th>{t("some-items")}</th>
									<th>{t("action")}</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((ig) => (
									<tr key={ig.id}>
										{logUser?.role == "headAdmin" && (
											<td>
												<Link to={`/admin/material/item/${ig?.id}`}>{ig?.id}</Link>
											</td>
										)}
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
													<span className="table-action first">{t("update")}</span>
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
