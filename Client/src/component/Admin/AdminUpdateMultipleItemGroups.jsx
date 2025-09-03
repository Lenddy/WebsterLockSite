import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import Select from "react-select";
import Fuse from "fuse.js";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import { create_multiple_itemGroups } from "../../../graphQL/mutations/mutations";

export default function AdminUpdateMultipleItemsGroups() {
	const [oldItemGroups, setOldItemGroups] = useState([]);
	const [selectedGroups, setSelectedGroups] = useState([]);
	const [changesMade, setChangesMade] = useState(false);

	const { loading, data, error } = useQuery(get_all_item_groups);
	const [createNewItemGroups] = useMutation(create_multiple_itemGroups);

	useEffect(() => {
		if (data?.getAllItemGroups) {
			setOldItemGroups(data.getAllItemGroups);
		}
	}, [data]);

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

	const addGroupEditor = (selected) => {
		if (!selected) return;

		const alreadyAdded = selectedGroups.some((g) => g.id === selected.value);
		if (alreadyAdded) return; // prevent duplicates

		const group = oldItemGroups.find((g) => g.id === selected.value);
		const newGroup = {
			...group,
			itemsList: group.itemsList.map((i) => ({ ...i, action: {} })),
			brandAction: {},
		};

		setSelectedGroups((prev) => [...prev, newGroup]);
		setChangesMade(false);
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
		updated[groupIdx].itemsList[itemIdx] = {
			...updated[groupIdx].itemsList[itemIdx],
			itemName: value,
			action: { toBeUpdated: true },
		};
		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const addItem = (groupIdx) => {
		const updated = [...selectedGroups];
		updated[groupIdx].itemsList.push({
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
			updated[groupIdx].itemsList[itemIdx] = {
				...item,
				action: { toBeDeleted: true },
			};
		} else {
			updated[groupIdx].itemsList.splice(itemIdx, 1);
		}
		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const submit = async (e) => {
		e.preventDefault();

		if (!changesMade) {
			alert("No changes made.");
			return;
		}

		const input = selectedGroups.map((g) => ({
			id: g.id,
			brand: g.brand,
			brandAction: g.brandAction,
			itemsList: g.itemsList,
		}));

		console.log("Submitting:", input);

		await createNewItemGroups({
			variables: { input },
			onCompleted: (res) => console.log("Success:", res),
			onError: (err) => console.error("Error:", err),
		});
	};

	return (
		<div>
			<h2>Update Item Groups</h2>

			{/* Step 1: Add group editor */}
			<div style={{ marginBottom: "20px" }}>
				<Select options={options} placeholder="Select Item Group to Edit" filterOption={customUserFilter} isSearchable isClearable onChange={addGroupEditor} />
				<button
					type="button"
					style={{ marginTop: "10px" }}
					onClick={() => {
						// force trigger dropdown open? left simple
					}}>
					Edit Another Item Group
				</button>
			</div>

			{/* Step 2: Show selected groups */}
			{selectedGroups.map((group, gIdx) => (
				<div
					key={group.id}
					style={{
						border: "1px solid #ddd",
						margin: "10px 0",
						padding: "10px",
						borderRadius: "8px",
					}}>
					<h3>Editing Group: {group.brand}</h3>

					{/* Brand */}
					<div>
						<label>Brand:</label>
						<input type="text" value={group.brand} onChange={(e) => handleBrandChange(gIdx, e.target.value)} />
					</div>

					{/* Items */}
					<h4>Items</h4>
					{group.itemsList.map((item, idx) => (
						<div key={idx} style={{ marginBottom: "10px" }}>
							{item.action?.toBeDeleted ? (
								<span style={{ color: "red" }}>{item.itemName} (Marked for Deletion)</span>
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
				</div>
			))}

			{/* Step 3: Submit */}
			<br />
			<button type="submit" onClick={submit} disabled={!changesMade}>
				Submit All Changes
			</button>
		</div>
	);
}
