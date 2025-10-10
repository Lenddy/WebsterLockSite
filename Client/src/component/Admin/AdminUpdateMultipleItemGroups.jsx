// import { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useQuery, useMutation } from "@apollo/client";
// import { get_all_item_groups, get_one_item_group } from "../../../graphQL/queries/queries";
// import { update_multiple_item_groups } from "../../../graphQL/mutations/mutations";
// import Modal from "../Modal";
// import { useAuth } from "../../context/AuthContext"; // make sure this path is correct

// export default function AdminUpdateMultipleItemsGroups() {
// 	const { itemGroupId } = useParams(); // if present → single edit
// 	const navigate = useNavigate();
// 	const { userToken, setUserToken, loading: authLoading } = useAuth();

// 	// ---- States ----
// 	const [itemGroups, setItemGroups] = useState([]);
// 	const [selectedGroups, setSelectedGroups] = useState([]);
// 	const [loadingState, setLoadingState] = useState(true);
// 	const [isOpen, setIsOpen] = useState(false);

// 	const [UpdateMultipleItemGroups] = useMutation(update_multiple_item_groups);

// 	// ---- Queries ----
// 	const {
// 		data: allGroupsData,
// 		loading: allGroupsLoading,
// 		error: allGroupsError,
// 	} = useQuery(get_all_item_groups, {
// 		skip: !!itemGroupId, // skip if editing one
// 	});

// 	const {
// 		data: oneGroupData,
// 		loading: oneGroupLoading,
// 		error: oneGroupError,
// 	} = useQuery(get_one_item_group, {
// 		variables: { id: itemGroupId },
// 		skip: !itemGroupId, // skip if editing multiple
// 	});

// 	// ---- Effect: handle fetched data ----
// 	useEffect(() => {
// 		if (authLoading) return;

// 		if (itemGroupId && oneGroupData) {
// 			setItemGroups([oneGroupData.getOneItemGroup]);
// 			setSelectedGroups([oneGroupData.getOneItemGroup]);
// 			setLoadingState(false);
// 		} else if (!itemGroupId && allGroupsData) {
// 			setItemGroups(allGroupsData.getAllItemGroups || []);
// 			setSelectedGroups(allGroupsData.getAllItemGroups || []);
// 			setLoadingState(false);
// 		}

// 		if (allGroupsError || oneGroupError) {
// 			console.error("Error fetching item groups:", allGroupsError || oneGroupError);
// 			setLoadingState(false);
// 		}
// 	}, [authLoading, oneGroupData, allGroupsData, allGroupsError, oneGroupError, itemGroupId]);

// 	// ---- Handle change ----
// 	const handleChange = (groupIndex, field, value) => {
// 		const updated = [...selectedGroups];
// 		updated[groupIndex][field] = value;
// 		setSelectedGroups(updated);
// 	};

// 	// ---- Submit ----
// 	const handleSubmit = async (e) => {
// 		e.preventDefault();

// 		try {
// 			const formatted = selectedGroups.map((g) => ({
// 				id: g.id,
// 				brand: g.brand,
// 				itemsList: g.itemsList.map((item) => ({
// 					id: item.id,
// 					itemName: item.itemName,
// 					description: item.description,
// 				})),
// 			}));

// 			await UpdateMultipleItemGroups({
// 				variables: { input: formatted },
// 				onCompleted: (res) => {
// 					console.log("Updated successfully:", res.updateMultipleItemGroups);
// 					navigate("/admin/item-groups");
// 				},
// 			});
// 		} catch (err) {
// 			console.error("Update error:", err);
// 		}
// 	};

// 	// ---- Render ----
// 	if (loadingState || authLoading) return <div className="loading">Loading item groups...</div>;

// 	if (!selectedGroups?.length) return <div className="no-data">No item groups available to edit.</div>;

// 	return (
// 		<div className="update-container">
// 			<h1 className="update-form-title">{itemGroupId ? "Edit Single Item Group" : "Edit Multiple Item Groups"}</h1>

// 			<form className="update-form" onSubmit={handleSubmit}>
// 				{selectedGroups.map((group, idx) => (
// 					<div key={group.id || idx} className="item-group-block">
// 						<h2 className="group-header">{group.brand}</h2>

// 						<div className="form-row">
// 							<label>Brand</label>
// 							<input type="text" value={group.brand} onChange={(e) => handleChange(idx, "brand", e.target.value)} placeholder="Brand name" />
// 						</div>

// 						{/* Items inside group */}
// 						{group.itemsList?.map((item, itemIdx) => (
// 							<div key={item.id || itemIdx} className="item-row">
// 								<label>Item Name</label>
// 								<input
// 									type="text"
// 									value={item.itemName}
// 									onChange={(e) => {
// 										const newGroups = [...selectedGroups];
// 										newGroups[idx].itemsList[itemIdx].itemName = e.target.value;
// 										setSelectedGroups(newGroups);
// 									}}
// 									placeholder="Item name"
// 								/>

// 								<label>Description</label>
// 								<textarea
// 									value={item.description || ""}
// 									onChange={(e) => {
// 										const newGroups = [...selectedGroups];
// 										newGroups[idx].itemsList[itemIdx].description = e.target.value;
// 										setSelectedGroups(newGroups);
// 									}}
// 									placeholder="Item description"
// 								/>
// 							</div>
// 						))}
// 					</div>
// 				))}

// 				<div className="form-actions">
// 					<button type="button" onClick={() => setIsOpen(true)} className="form-submit-btn">
// 						Save Changes
// 					</button>
// 				</div>

// 				<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} onConFirm={handleSubmit} data={{ selectedGroups }} />
// 			</form>
// 		</div>
// 	);
// }

// !!!!!!!
// !!!!!!!
// !!!!!!!
// !!!!!!!
// !!!!!!!
// !!!!!!!
// !!!!!!!

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import Select from "react-select";
import Fuse from "fuse.js";
import { get_all_item_groups, get_one_item_group } from "../../../graphQL/queries/queries";
import { update_multiple_itemGroups } from "../../../graphQL/mutations/mutations";
import { Link, useParams } from "react-router-dom";

export default function AdminUpdateMultipleItemsGroups() {
	const [oldItemGroups, setOldItemGroups] = useState([]);
	const [selectedGroups, setSelectedGroups] = useState([]);
	const [changesMade, setChangesMade] = useState(false);

	const { itemId } = useParams();

	//  Two queries: one for all, one for single
	const {
		loading: loadingAll,
		data: allData,
		error: errorAll,
	} = useQuery(get_all_item_groups, {
		skip: !!itemId, // skip if we're fetching one
	});

	const {
		loading: loadingOne,
		data: oneData,
		error: errorOne,
	} = useQuery(get_one_item_group, {
		variables: { id: itemId },
		skip: !itemId, // only run if we have param
	});

	const [updateItemGroups] = useMutation(update_multiple_itemGroups);

	//  Handle when all item groups are fetched (no param mode)
	useEffect(() => {
		if (!itemId && allData?.getAllItemGroups) {
			setOldItemGroups(allData.getAllItemGroups);
			if (selectedGroups.length === 0) {
				setSelectedGroups([{ id: null, brand: "", itemsList: [], brandAction: {} }]);
			}
		}
	}, [allData, itemId, selectedGroups.length]);

	//  Handle when single item group is fetched (param mode)
	useEffect(() => {
		if (itemId && oneData?.getOneItemGroup) {
			const group = oneData.getOneItemGroup;
			setSelectedGroups([
				{
					...group,
					itemsList: group.itemsList.map((i) => ({ ...i, action: {} })),
					brandAction: {},
				},
			]);
			setOldItemGroups([group]); // so dropdown still works
		}
	}, [oneData, itemId]);

	const options = oldItemGroups.map((g) => ({
		value: g.id,
		label: g.brand,
	}));

	// Custom fuzzy search filter
	const customUserFilter = (option, inputValue) => {
		if (!inputValue) return true;
		const fuse = new Fuse(options, { keys: ["label"], threshold: 0.4 });
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	const handleSelectGroup = (groupIdx, selected) => {
		if (!selected) return;
		const alreadyAdded = selectedGroups.some((g, idx) => g.id === selected.value && idx !== groupIdx);
		if (alreadyAdded) return;

		const group = oldItemGroups.find((g) => g.id === selected.value);
		const newGroup = {
			...group,
			itemsList: group.itemsList.map((i) => ({ ...i, action: {} })),
			brandAction: {},
		};

		const updated = [...selectedGroups];
		updated[groupIdx] = newGroup;
		setSelectedGroups(updated);
	};

	const handleBrandChange = (groupIdx, value) => {
		const updated = [...selectedGroups];
		updated[groupIdx].brand = value;
		updated[groupIdx].brandAction = { toBeUpdated: true };
		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const handleItemChange = (groupIdx, itemIdx, value) => {
		const updated = [...selectedGroups];
		const item = updated[groupIdx].itemsList[itemIdx];

		updated[groupIdx].itemsList[itemIdx] = {
			...item,
			itemName: value,
			action: item.id ? { toBeUpdated: true } : { toBeAdded: true },
		};

		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const addItem = (groupIdx) => {
		const updated = [...selectedGroups];
		updated[groupIdx].itemsList.push({
			id: null,
			itemName: "",
			action: { toBeAdded: true },
		});
		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const deleteItem = (groupIdx, itemIdx) => {
		const updated = [...selectedGroups];
		const item = updated[groupIdx].itemsList[itemIdx];

		if (item.id) {
			updated[groupIdx].itemsList[itemIdx] = { ...item, action: { toBeDeleted: true } };
		} else {
			updated[groupIdx].itemsList.splice(itemIdx, 1);
		}

		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const undoDeleteItem = (groupIdx, itemIdx) => {
		const updated = [...selectedGroups];
		updated[groupIdx].itemsList[itemIdx] = {
			...updated[groupIdx].itemsList[itemIdx],
			action: {},
		};
		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const addGroupEditor = () => {
		setSelectedGroups((prev) => [...prev, { id: null, brand: "", itemsList: [], brandAction: {} }]);
	};

	const removeGroupEditor = (groupIdx) => {
		setSelectedGroups((prev) => prev.filter((_, idx) => idx !== groupIdx));
	};

	const submit = async (e) => {
		e.preventDefault();

		if (!changesMade) {
			alert("No changes made.");
			return;
		}

		const input = selectedGroups
			.filter((g) => g.id)
			.map((g) => {
				const groupPayload = { id: g.id };
				if (g.brandAction?.toBeUpdated) {
					groupPayload.brand = g.brand;
					groupPayload.brandNameUpdate = true;
				}

				const changedItems = g.itemsList
					.filter((item) => item.action?.toBeAdded || item.action?.toBeUpdated || item.action?.toBeDeleted)
					.map((item) => {
						const payload = { action: {} };
						if (item.id) payload.id = item.id;
						if (item.itemName && (item.action?.toBeAdded || item.action?.toBeUpdated)) {
							payload.itemName = item.itemName;
						}
						if (item.action?.toBeAdded) payload.action.toBeAdded = true;
						if (item.action?.toBeUpdated) payload.action.toBeUpdated = true;
						if (item.action?.toBeDeleted) payload.action.toBeDeleted = true;
						return payload;
					});

				if (changedItems.length > 0) groupPayload.itemsList = changedItems;
				return groupPayload;
			})
			.filter((g) => g.brand || g.brandNameUpdate || g.itemsList);

		if (input.length === 0) {
			alert("No real changes to submit.");
			return;
		}

		console.log("Submitting:", input);

		await updateItemGroups({
			variables: { input },
			onCompleted: (res) => console.log("Success:", res),
			onError: (err) => console.error("Error:", err),
		});
	};

	const isLoading = loadingAll || loadingOne;
	const hasError = errorAll || errorOne;

	if (isLoading) return <p>Loading...</p>;
	if (hasError) return <p>Error loading data</p>;

	return (
		<div className="update-container">
			{/* add a form later  */}
			<form onSubmit={submit} className="update-form">
				{selectedGroups.map((group, gIdx) => (
					<div key={gIdx} className="request-block" style={{ marginBottom: "10px" }}>
						<div className="update-form-wrapper">
							<div>
								<Select
									options={options.filter((opt) => !selectedGroups.some((g, idx) => g.id === opt.value && idx !== gIdx))}
									value={group.id ? options.find((opt) => opt.value === group.id) : null}
									placeholder="Select Item Group to Edit"
									filterOption={customUserFilter}
									isSearchable
									onChange={(selected) => handleSelectGroup(gIdx, selected)}
									isDisabled={!!itemId} //  disable dropdown if loaded from param
									styles={{
										control: (base, state) => ({
											...base,
											borderRadius: "12px",
											borderColor: "blue",
											width: "250px",
											height: "50px",
											opacity: state.isDisabled ? 0.6 : 1,
											cursor: state.isDisabled ? "not-allowed" : "default",
											scale: 1,
										}),
										option: (base, state) => ({
											...base,
											backgroundColor: state.isFocused ? "lightblue" : "white",
											color: "black",
										}),
									}}
								/>
							</div>

							<div className="update-form-row">
								<div className="form-row-top-container material-request">
									{group.id && (
										<div className="form-row-top-right material-request">
											<label>Brand:</label>
											<input type="text" value={group.brand} onChange={(e) => handleBrandChange(gIdx, e.target.value)} />
										</div>
									)}
								</div>
								{/* <h4>Items</h4> */}
								<div className="form-row-center item-group">
									{group.id && (
										<>
											<label>Items</label>
											{group.itemsList.map((item, idx) => (
												<div key={idx} className="form-row-top-right material-request  update-form-input">
													{item.action?.toBeDeleted ? (
														<div>
															<span style={{ color: "red" }}>{item.itemName} (Marked for Deletion)</span>
															<span className="remove-row-btn" onClick={() => undoDeleteItem(gIdx, idx)}>
																Undo
															</span>
														</div>
													) : (
														<>
															<input type="text" value={item.itemName} onChange={(e) => handleItemChange(gIdx, idx, e.target.value)} />
															<span className="remove-row-btn" onClick={() => deleteItem(gIdx, idx)}>
																Delete
															</span>
														</>
													)}
												</div>
											))}
											<div className="form-action-btn">
												<div className="form-row-remove-btn-container">
													<span className="form-add-row-btn" style={{ margin: "10px 0px" }} onClick={() => addItem(gIdx)}>
														+ Add Item
													</span>
												</div>

												{selectedGroups.length > 1 && !itemId && (
													<div className="form-row-remove-btn-container">
														<span className="remove-row-btn" style={{ margin: "10px 0px" }} onClick={() => removeGroupEditor(gIdx)}>
															Remove Group
														</span>
													</div>
												)}
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				))}

				<div className="form-action-btn">
					{/* Only allow adding new groups if not editing single group */}
					{!itemId && (
						<span className="form-add-row-btn" type="button" onClick={addGroupEditor}>
							+ Add Group
						</span>
					)}

					<div>
						<button type="submit" className="form-submit-btn" disabled={!changesMade}>
							Update
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}

// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!
// !!!!!!!!

// import { useEffect, useState } from "react";
// import { useMutation, useQuery } from "@apollo/client";
// import Select from "react-select";
// import Fuse from "fuse.js";
// import { get_all_item_groups } from "../../../graphQL/queries/queries";
// import { update_multiple_itemGroups, get_one_item_group } from "../../../graphQL/mutations/mutations";
// import { Link, useNavigate, useParams } from "react-router-dom";

// export default function AdminUpdateMultipleItemsGroups() {
// 	const [oldItemGroups, setOldItemGroups] = useState([]);
// 	const [selectedGroups, setSelectedGroups] = useState([]);
// 	const [changesMade, setChangesMade] = useState(false);

// 	const { loading, data, error } = useQuery(get_all_item_groups);
// 	const [updateItemGroups] = useMutation(update_multiple_itemGroups);

// 	const { itemId } = useParams();

// 	useEffect(() => {
// 		if (data?.getAllItemGroups) {
// 			setOldItemGroups(data.getAllItemGroups);

// 			// Initialize with one dropdown row
// 			if (selectedGroups.length === 0) {
// 				setSelectedGroups([{ id: null, brand: "", itemsList: [], brandAction: false }]);
// 			}
// 		}
// 	}, [data, selectedGroups]);

// 	const options = oldItemGroups.map((g) => ({
// 		value: g.id,
// 		label: g.brand,
// 	}));

// 	// Custom fuzzy filter
// 	const customUserFilter = (option, inputValue) => {
// 		if (!inputValue) return true;
// 		const fuse = new Fuse(options, { keys: ["label"], threshold: 0.4 });
// 		return fuse.search(inputValue).some((r) => r.item.value === option.value);
// 	};

// 	const handleSelectGroup = (groupIdx, selected) => {
// 		if (!selected) return;

// 		// Prevent selecting the same group twice
// 		const alreadyAdded = selectedGroups.some((g, idx) => g.id === selected.value && idx !== groupIdx);
// 		if (alreadyAdded) return;

// 		const group = oldItemGroups.find((g) => g.id === selected.value);
// 		const newGroup = {
// 			...group,
// 			itemsList: group.itemsList.map((i) => ({ ...i, action: {} })),
// 			brandAction: {},
// 		};

// 		const updated = [...selectedGroups];
// 		updated[groupIdx] = newGroup;
// 		setSelectedGroups(updated);
// 	};

// 	const handleBrandChange = (groupIdx, value) => {
// 		const updated = [...selectedGroups];
// 		updated[groupIdx].brand = value;
// 		updated[groupIdx].brandAction = { toBeUpdated: true }; // clear & clean flag
// 		setSelectedGroups(updated);
// 		setChangesMade(true);
// 	};

// 	const handleItemChange = (groupIdx, itemIdx, value) => {
// 		const updated = [...selectedGroups];
// 		const item = updated[groupIdx].itemsList[itemIdx];

// 		updated[groupIdx].itemsList[itemIdx] = {
// 			...item,
// 			itemName: value,
// 			action: item.id
// 				? { toBeUpdated: true } // existing item being changed
// 				: { toBeAdded: true }, // new item being typed
// 		};

// 		setSelectedGroups(updated);
// 		setChangesMade(true);
// 	};

// 	const addItem = (groupIdx) => {
// 		const updated = [...selectedGroups];
// 		updated[groupIdx].itemsList.push({
// 			id: null, // new item has no id
// 			itemName: "",
// 			action: { toBeAdded: true },
// 		});
// 		setSelectedGroups(updated);
// 		setChangesMade(true);
// 	};

// 	const deleteItem = (groupIdx, itemIdx) => {
// 		const updated = [...selectedGroups];
// 		const item = updated[groupIdx].itemsList[itemIdx];

// 		if (item.id) {
// 			// existing item → mark for deletion
// 			updated[groupIdx].itemsList[itemIdx] = {
// 				...item,
// 				action: { toBeDeleted: true },
// 			};
// 		} else {
// 			// new item → remove entirely
// 			updated[groupIdx].itemsList.splice(itemIdx, 1);
// 		}

// 		setSelectedGroups(updated);
// 		setChangesMade(true);
// 	};

// 	const undoDeleteItem = (groupIdx, itemIdx) => {
// 		const updated = [...selectedGroups];
// 		updated[groupIdx].itemsList[itemIdx] = {
// 			...updated[groupIdx].itemsList[itemIdx],
// 			action: {},
// 		};
// 		setSelectedGroups(updated);
// 		setChangesMade(true);
// 	};

// 	const addGroupEditor = () => {
// 		setSelectedGroups((prev) => [...prev, { id: null, brand: "", itemsList: [], brandAction: {} }]);
// 	};

// 	const removeGroupEditor = (groupIdx) => {
// 		setSelectedGroups((prev) => prev.filter((_, idx) => idx !== groupIdx));
// 	};

// 	const submit = async (e) => {
// 		e.preventDefault();

// 		if (!changesMade) {
// 			alert("No changes made.");
// 			return;
// 		}

// 		const input = selectedGroups
// 			.filter((g) => g.id) // only valid groups
// 			.map((g) => {
// 				const groupPayload = { id: g.id };

// 				// Brand changes
// 				if (g.brandAction?.toBeUpdated) {
// 					groupPayload.brand = g.brand;
// 					groupPayload.brandNameUpdate = true;
// 				}

// 				// Items changes (only changed ones)
// 				const changedItems = g.itemsList
// 					.filter((item) => item.action?.toBeAdded || item.action?.toBeUpdated || item.action?.toBeDeleted)
// 					.map((item) => {
// 						const payload = { action: {} };

// 						if (item.id) payload.id = item.id;
// 						if (item.itemName && (item.action?.toBeAdded || item.action?.toBeUpdated)) {
// 							payload.itemName = item.itemName;
// 						}

// 						if (item.action?.toBeAdded) payload.action.toBeAdded = true;
// 						if (item.action?.toBeUpdated) payload.action.toBeUpdated = true;
// 						if (item.action?.toBeDeleted) payload.action.toBeDeleted = true;

// 						return payload;
// 					});

// 				if (changedItems.length > 0) {
// 					groupPayload.itemsList = changedItems;
// 				}

// 				return groupPayload;
// 			})
// 			.filter((g) => g.brand || g.brandNameUpdate || g.itemsList); // send only groups with actual changes

// 		if (input.length === 0) {
// 			alert("No real changes to submit.");
// 			return;
// 		}

// 		console.log("Submitting:", input);

// 		await updateItemGroups({
// 			variables: { input },
// 			onCompleted: (res) => console.log("Success:", res),
// 			onError: (err) => console.error("Error:", err),
// 		});
// 	};

// 	return (
// 		<div>
// 			<h2>Update Item Groups</h2>

// 			<div>
// 				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
// 					log out
// 				</Link>
// 			</div>

// 			<div>
// 				<Link to={"/user/all"}>all users</Link>
// 			</div>

// 			<div>
// 				<Link to={"/material/request/all"}>all Material Requests</Link>
// 			</div>

// 			<div>
// 				<Link to={""}>blank</Link>
// 			</div>

// 			{selectedGroups.map((group, gIdx) => (
// 				<div
// 					key={gIdx}
// 					style={{
// 						border: "1px solid #ddd",
// 						margin: "10px 0",
// 						padding: "10px",
// 						borderRadius: "8px",
// 					}}>
// 					{/* Group dropdown */}
// 					<Select
// 						options={options.filter((opt) => !selectedGroups.some((g, idx) => g.id === opt.value && idx !== gIdx))}
// 						value={group.id ? options.find((opt) => opt.value === group.id) : null}
// 						placeholder="Select Item Group to Edit"
// 						filterOption={customUserFilter}
// 						isSearchable
// 						onChange={(selected) => handleSelectGroup(gIdx, selected)}
// 						styles={{
// 							control: (base) => ({
// 								...base,
// 								borderRadius: "12px",
// 								borderColor: "blue",
// 								width: "250px",
// 								height: "50px",
// 							}),
// 							option: (base, state) => ({
// 								...base,
// 								backgroundColor: state.isFocused ? "lightblue" : "white",
// 								color: "black",
// 							}),
// 						}}
// 					/>

// 					{/* Brand */}
// 					{group.id && (
// 						<div>
// 							<label>Brand:</label>
// 							<input type="text" value={group.brand} onChange={(e) => handleBrandChange(gIdx, e.target.value)} />
// 						</div>
// 					)}

// 					{/* Items */}
// 					{group.id && (
// 						<>
// 							<h4>Items</h4>
// 							{group.itemsList.map((item, idx) => (
// 								<div key={idx} style={{ marginBottom: "10px" }}>
// 									{item.action?.toBeDeleted ? (
// 										<>
// 											<span style={{ color: "red" }}>{item.itemName} (Marked for Deletion)</span>
// 											<button type="button" onClick={() => undoDeleteItem(gIdx, idx)}>
// 												Undo
// 											</button>
// 										</>
// 									) : (
// 										<>
// 											<input type="text" value={item.itemName} onChange={(e) => handleItemChange(gIdx, idx, e.target.value)} />
// 											<button type="button" onClick={() => deleteItem(gIdx, idx)}>
// 												Delete
// 											</button>
// 										</>
// 									)}
// 								</div>
// 							))}

// 							<button type="button" onClick={() => addItem(gIdx)}>
// 								+ Add Item
// 							</button>
// 						</>
// 					)}

// 					{/* Remove group row */}
// 					{selectedGroups.length > 1 && (
// 						<button type="button" style={{ marginTop: "10px", color: "red" }} onClick={() => removeGroupEditor(gIdx)}>
// 							Remove This Item Group
// 						</button>
// 					)}
// 				</div>
// 			))}

// 			{/* Add new group row */}
// 			<button type="button" onClick={addGroupEditor}>
// 				+ Edit Another Item Group
// 			</button>

// 			<br />
// 			<button type="submit" onClick={submit} disabled={!changesMade}>
// 				Submit All Changes
// 			</button>
// 		</div>
// 	);
// }
