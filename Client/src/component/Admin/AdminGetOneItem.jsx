import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_one_item_group } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation } from "react-router-dom";
import Modal from "../Modal";
import Fuse from "fuse.js";

export default function AdminGetOneItem({ userToken }) {
	const [item, setItem] = useState([]);
	const [logUser, setLogUser] = useState({});
	const { itemId } = useParams();
	const { error, loading, data, refetch } = useQuery(get_one_item_group, { variables: { id: itemId } });
	// const decoded = ;
	const [isOpen, setIsOpen] = useState(false);

	const [selectedItem, setSelectedItem] = useState(null);

	const [searchValue, setSearchValue] = useState(""); // persistent search
	const [filteredItems, setFilteredItems] = useState([]);
	const [items, setItems] = useState([]);

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			console.log("loading");
		}
		if (data) {
			console.log(data?.getOneItemGroup);
			setItem(data?.getOneItemGroup);
			setFilteredItems(data?.getOneItemGroup);
		}
		if (error) {
			console.log("there was an error", error);
		}
	}, [loading, data, error]); //refetch
	// // Subscription for client changes

	// 	useSubscription(CLIENT_CHANGE_SUBSCRIPTION, {
	// 		onError: err => console.log("this is the error from subscription", err),
	// 		onData: infoChange => {
	// 			// console.log("this the subscription :", infoChange);
	// 			const changeClient = infoChange?.data?.data?.onClientChange;
	// 			const { eventType, clientChanges } = changeClient;
	// 			// console.log("New data from subscription:", changeClient);
	// 			if (eventType === "CLIENT_ADDED") {
	// 				// Handle new client addition
	// 				setClients(prevClients => [...prevClients, clientChanges]);
	// 			} else if (eventType === "CLIENT_UPDATED") {
	// 				// Handle client update
	// 				setClients(prevClients => prevClients.map(c => (c.id === clientChanges.id ? clientChanges : c)));
	// 			} else if (eventType === "CLIENT_DELETED") {
	// 				// Handle client deletion
	// 				setClients(prevClients => prevClients.filter(c => c.id !== clientChanges.id));
	// 			}
	// 		},
	// 		onComplete: complete => console.log("subscription completed", complete),

	// Fuse.js search function
	const applyFuse = (list, search) => {
		if (!search) return list;
		console.log("this is the list ", list);

		const fuse = new Fuse(list, {
			keys: ["item"],
			threshold: 0.4,
		});

		console.log("this is fuse ", fuse);

		return fuse.search(search).map((r) => r.item);
	};

	// Handle input change
	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchValue(val);
		setFilteredItems(applyFuse(item, val));
	};

	// Clear search manually
	const clearSearch = () => {
		setSearchValue("");
		setFilteredItems(item);
	};

	return (
		<>
			{/* {/*  */}
			{loading ? (
				<div>
					<h1>loading...</h1>
				</div>
			) : (
				<div className="list-get-all-content">
					<div className="search-filter-wrapper">
						<div className="search-filter-container">
							<input type="text" className="search-filter-input" placeholder="Search Brand by Brand Name" value={searchValue} onChange={handleSearchChange} autoComplete="false" />
							<button
								className="search-clear-btn"
								onClick={clearSearch}
								disabled={!searchValue} // disabled when input is empty
							>
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
								{filteredItems?.itemsList?.map((item) => {
									return (
										<tr key={item.id}>
											<td>{item.id}</td>
											<td>{item.itemName}</td>
											<td>
												<span
													className="table-action last"
													onClick={() => {
														// setSelectedUser(user);
														setIsOpen(true);
													}}>
													{" "}
													delete
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={true} userToken={userToken} />
				</div>
			)}
			{error && <p style={{ color: "red" }}> {error.message}</p>}
		</>
	);
}
