import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { get_one_item_group } from "../../../../graphQL/queries/queries";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ITEM_GROUP_CHANGE_SUBSCRIPTION } from "../../../../graphQL/subscriptions/subscriptions";
import Fuse from "fuse.js";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext"; // use context

export default function AdminGetOneItem() {
	const { userToken, setPageLoading } = useAuth(); // get token from context
	const [itemGroup, setItemGroup] = useState(null); // the full group (brand + itemsList)
	const [filteredItems, setFilteredItems] = useState([]); // only items
	const [searchValue, setSearchValue] = useState("");
	const { itemId } = useParams();
	const [logUser, setLogUser] = useState(null);
	const { error, loading, data } = useQuery(get_one_item_group, {
		variables: { id: itemId },
	});

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

	// Helper function to sort items alphabetically by itemName
	const sortByItemName = (list) => {
		return [...list].sort((a, b) => {
			if (!a.itemName) return 1;
			if (!b.itemName) return -1;
			return a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase());
		});
	};

	// Update useEffect for query data
	useEffect(() => {
		if (data?.getOneItemGroup) {
			const group = data.getOneItemGroup;
			console.log(group);
			setItemGroup(group);
			setFilteredItems(sortByItemName(group.itemsList || []));
		}
	}, [data]);

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

	// Update search handlers to sort results alphabetically
	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		const filtered = applyFuse(itemGroup?.itemsList || [], val);
		setFilteredItems(sortByItemName(filtered));
	};

	const clearSearch = () => {
		setSearchValue("");
		setFilteredItems(sortByItemName(itemGroup?.itemsList || []));
	};

	//  Render
	if (loading) return <h1>{t("loading")}</h1>;
	if (error) return <p style={{ color: "red" }}>{error.message}</p>;
	if (!itemGroup) return <h2>{t("no-item-group-found")}</h2>;

	return (
		<div className="list-get-all-content">
			{/* <h2>Brand: {itemGroup.brand}</h2> */}

			<div className="search-filter-wrapper">
				<div className="search-filter-container">
					<input type="text" className="search-filter-input" placeholder={t("search-items-by-name")} value={searchValue} onChange={handleSearchChange} autoComplete="off" />
					<button className="search-clear-btn" onClick={clearSearch} disabled={!searchValue}>
						✕
					</button>
				</div>
			</div>

			<div className="table-wrapper">
				<div className="table-title">
					<h2>{itemGroup?.brand}</h2>
				</div>

				<table>
					<thead>
						<tr>
							{logUser?.role == "headAdmin" && <th>ID</th>}
							<th>{t("item-name")}</th>
							<th>{t("action")}</th>
						</tr>
					</thead>

					<tbody>
						{filteredItems.map((it) => (
							<tr key={it.id}>
								{logUser?.role == "headAdmin" && <td>{it.id}</td>}

								<td>{it.itemName}</td>
								<td>
									<div className="table-action-wrapper">
										<Link to={`/admin/material/item/${itemId}/update`}>
											<span className="table-action first">{t("update")}</span>
										</Link>

										<Link to={`/admin/material/item/${itemId}/update`}>
											<span className="table-action last">{t("delete")}</span>
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
