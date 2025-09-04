import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import Select from "react-select";
import Fuse from "fuse.js";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import { update_multiple_itemGroups } from "../../../graphQL/mutations/mutations";
import { Link, useNavigate } from "react-router-dom";

export default function AdminUpdateMultipleItemsGroups() {
	const [oldItemGroups, setOldItemGroups] = useState([]);
	const [selectedGroups, setSelectedGroups] = useState([]);
	const [changesMade, setChangesMade] = useState(false);

	const { loading, data, error } = useQuery(get_all_item_groups);
	const [updateItemGroups] = useMutation(update_multiple_itemGroups);

	useEffect(() => {
		if (data?.getAllItemGroups) {
			setOldItemGroups(data.getAllItemGroups);

			// Initialize with one dropdown row
			if (selectedGroups.length === 0) {
				setSelectedGroups([{ id: null, brand: "", itemsList: [], brandAction: false }]);
			}
		}
	}, [data, selectedGroups]);

	const options = oldItemGroups.map((g) => ({
		value: g.id,
		label: g.brand,
	}));

	// Custom fuzzy filter
	const customUserFilter = (option, inputValue) => {
		if (!inputValue) return true;
		const fuse = new Fuse(options, { keys: ["label"], threshold: 0.4 });
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	const handleSelectGroup = (groupIdx, selected) => {
		if (!selected) return;

		// Prevent selecting the same group twice
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
		updated[groupIdx].brandAction = { toBeUpdated: true }; // clear & clean flag
		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const handleItemChange = (groupIdx, itemIdx, value) => {
		const updated = [...selectedGroups];
		const item = updated[groupIdx].itemsList[itemIdx];

		updated[groupIdx].itemsList[itemIdx] = {
			...item,
			itemName: value,
			action: item.id
				? { toBeUpdated: true } // existing item being changed
				: { toBeAdded: true }, // new item being typed
		};

		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const addItem = (groupIdx) => {
		const updated = [...selectedGroups];
		updated[groupIdx].itemsList.push({
			id: null, // new item has no id
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
			// existing item → mark for deletion
			updated[groupIdx].itemsList[itemIdx] = {
				...item,
				action: { toBeDeleted: true },
			};
		} else {
			// new item → remove entirely
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
			.filter((g) => g.id) // only valid groups
			.map((g) => {
				const groupPayload = { id: g.id };

				// Brand changes
				if (g.brandAction?.toBeUpdated) {
					groupPayload.brand = g.brand;
					groupPayload.brandNameUpdate = true;
				}

				// Items changes (only changed ones)
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

				if (changedItems.length > 0) {
					groupPayload.itemsList = changedItems;
				}

				return groupPayload;
			})
			.filter((g) => g.brand || g.brandNameUpdate || g.itemsList); // send only groups with actual changes

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

	return (
		<div>
			<h2>Update Item Groups</h2>

			<div>
				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
					log out
				</Link>
			</div>

			<div>
				<Link to={"/user/all"}>all users</Link>
			</div>

			<div>
				<Link to={"/material/request/all"}>all Material Requests</Link>
			</div>

			<div>
				<Link to={""}>blank</Link>
			</div>

			{selectedGroups.map((group, gIdx) => (
				<div
					key={gIdx}
					style={{
						border: "1px solid #ddd",
						margin: "10px 0",
						padding: "10px",
						borderRadius: "8px",
					}}>
					{/* Group dropdown */}
					<Select
						options={options.filter((opt) => !selectedGroups.some((g, idx) => g.id === opt.value && idx !== gIdx))}
						value={group.id ? options.find((opt) => opt.value === group.id) : null}
						placeholder="Select Item Group to Edit"
						filterOption={customUserFilter}
						isSearchable
						onChange={(selected) => handleSelectGroup(gIdx, selected)}
						styles={{
							control: (base) => ({
								...base,
								borderRadius: "12px",
								borderColor: "blue",
								width: "250px",
								height: "50px",
							}),
							option: (base, state) => ({
								...base,
								backgroundColor: state.isFocused ? "lightblue" : "white",
								color: "black",
							}),
						}}
					/>

					{/* Brand */}
					{group.id && (
						<div>
							<label>Brand:</label>
							<input type="text" value={group.brand} onChange={(e) => handleBrandChange(gIdx, e.target.value)} />
						</div>
					)}

					{/* Items */}
					{group.id && (
						<>
							<h4>Items</h4>
							{group.itemsList.map((item, idx) => (
								<div key={idx} style={{ marginBottom: "10px" }}>
									{item.action?.toBeDeleted ? (
										<>
											<span style={{ color: "red" }}>{item.itemName} (Marked for Deletion)</span>
											<button type="button" onClick={() => undoDeleteItem(gIdx, idx)}>
												Undo
											</button>
										</>
									) : (
										<>
											<input type="text" value={item.itemName} onChange={(e) => handleItemChange(gIdx, idx, e.target.value)} />
											<button type="button" onClick={() => deleteItem(gIdx, idx)}>
												Delete
											</button>
										</>
									)}
								</div>
							))}

							<button type="button" onClick={() => addItem(gIdx)}>
								+ Add Item
							</button>
						</>
					)}

					{/* Remove group row */}
					{selectedGroups.length > 1 && (
						<button type="button" style={{ marginTop: "10px", color: "red" }} onClick={() => removeGroupEditor(gIdx)}>
							Remove This Item Group
						</button>
					)}
				</div>
			))}

			{/* Add new group row */}
			<button type="button" onClick={addGroupEditor}>
				+ Edit Another Item Group
			</button>

			<br />
			<button type="submit" onClick={submit} disabled={!changesMade}>
				Submit All Changes
			</button>
		</div>
	);
}
