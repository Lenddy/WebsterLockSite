import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import { create_multiple_material_requests } from "../../../graphQL/mutations/mutations";
import { get_all_users } from "../../../graphQL/queries/queries";
import Select from "react-select";
import Fuse from "fuse.js";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

// createMultipleMaterialRequests
// createMultipleMaterialRequest

export default function AdminCreateMultipleMaterialRequests() {
	const [users, setUsers] = useState([]);
	const [itemGroups, setItemGroups] = useState([]);
	const [requests, setRequests] = useState([
		{
			addedDate: "",
			description: "",
			items: [
				{
					brand: "",
					quantity: "",
					item: null,
					color: null,
					side: null,
					size: null,
					itemDescription: "",
				},
			],
			requester: {
				userId: "",
				email: "",
				name: "",
				role: "",
				permissions: {
					canEditUsers: false,
					canDeleteUsers: false,
					canChangeRole: false,
					canViewUsers: false,
					canViewAllUsers: false,
					canEditSelf: false,
					canViewSelf: false,
					canDeleteSelf: false,
					canRegisterUser: false,
				},
			},
		},
	]);

	const { loading, data, error, refetch } = useQuery(get_all_users);
	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_item_groups);
	const [createNewMaterialRequests] = useMutation(create_multiple_material_requests);

	const navigate = useNavigate();

	useEffect(() => {
		// setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (iGLoading) console.log("loading");

		if (loading) {
			console.log("loading");
		}

		if (data) {
			// console.log(data.getAllUsers);
			setUsers(data.getAllUsers);
		}

		if (iGData) {
			// console.log("this are the itemGroups", iGData?.getAllItemGroups || []);
			// store the fetched groups so we can build brands and items
			setItemGroups(iGData?.getAllItemGroups || []);
		}

		if (error) {
			console.log("there was an error", error);
		}

		if (iGError) {
			console.log("there was an error", iGError);
		}
		// const fetchData = async () => {
	}, [loading, iGLoading, data, iGData, error, iGError]);

	// Add a new request (with one blank row)
	const addRequest = () => {
		setRequests([
			...requests,
			{
				addedDate: "",
				description: "",
				items: [
					{
						brand: "",
						quantity: "",
						item: null,
						color: null,
						side: null,
						size: null,
						itemDescription: "",
					},
				],
				requester: {
					userId: "",
					email: "",
					name: "",
					role: "",
					permissions: {
						canEditUsers: false,
						canDeleteUsers: false,
						canChangeRole: false,
						canViewUsers: false,
						canViewAllUsers: false,
						canEditSelf: false,
						canViewSelf: false,
						canDeleteSelf: false,
						canRegisterUser: false,
					},
				},
			},
		]);
	};

	// Remove a whole request
	const removeRequest = (reqIdx) => {
		setRequests(requests.filter((_, i) => i !== reqIdx));
	};

	const addItemRow = (reqIdx) => {
		const updated = [...requests];
		updated[reqIdx].items.push({
			brand: null,
			quantity: "",
			item: null,
			color: null,
			side: null,
			size: null,
			itemDescription: "",
		});
		setRequests(updated);
	};

	const removeItemRow = (reqIdx, rowIdx) => {
		const updated = [...requests];
		updated[reqIdx].items = updated[reqIdx].items.filter((_, i) => i !== rowIdx);
		setRequests(updated);
	};

	const handleRequestChange = (reqIdx, field, value) => {
		const updated = [...requests];
		updated[reqIdx][field] = value;
		setRequests(updated);
	};

	const handleItemChange = (reqIdx, rowIdx, field, value) => {
		const updated = [...requests];
		updated[reqIdx].items[rowIdx][field] = value;
		setRequests(updated);
	};

	const userOptions = users.map((user) => ({
		label: `${user.name} (${user.email})`,
		value: {
			userId: user.id, //  your backend id
			email: user.email,
			name: user.name,
			role: user.role,
			permissions: { ...user.permissions },
		},
	}));

	const colorOptions = [
		{ value: "605/US3 - Bright Brass", label: "605/US3 - Bright Brass", hex: "#FFD700" }, // brass-ish
		{ value: "612/US10 - Satin Bronze", label: "612/US10 - Satin Bronze", hex: "#B08D57" },
		{ value: "619/US15 - Satin Nickel", label: "619/US15 - Satin Nickel", hex: "#AFAFAF" },
		{ value: "625/US26 - Bright Chrome", label: "625/US26 - Bright Chrome", hex: "#E5E4E2" },
		{ value: "626/US26D - Satin Chrome", label: "626/US26D - Satin Chrome", hex: "#C0C0C0" },
		{ value: "630/US32D - Satin Stainless Steel", label: "630/US32D - Satin Stainless Steel", hex: "#D6D6D6" },
		{ value: "622/ - Black", label: "622/ - Black", hex: "#000000" },
		{ value: "689/ - Aluminum", label: "689/ - Aluminum", hex: "#A9A9A9" },
	];

	const sideOptions = [
		{ value: "Left Hand", label: "Left Hand" },
		{ value: "Right Hand", label: "Right Hand" },
	];

	const sizeOptions = [
		{ value: "Small", label: "Small" },
		{ value: "Medium", label: "Medium" },
		{ value: "Large", label: "Large" },
	];

	const brands = [...new Set(itemGroups?.map((g) => g.brand))]?.map((b) => ({
		label: b,
		value: b,
	}));

	const allItems = itemGroups?.flatMap((group) =>
		group?.itemsList?.map((item) => ({
			// return item;

			label: `${group.brand} - ${item.itemName}`, // how it shows in the dropdown
			value: `${group.brand} - ${item.itemName}`, // what we send back
			brand: group.brand, // keep track of which brand this item belongs to
		}))
	);

	const customUserFilter = (option, inputValue) => {
		// If search is empty → show all
		if (!inputValue) return true;

		// Fuse.js fuzzy search across labels
		const fuse = new Fuse(userOptions, { keys: ["label"], threshold: 0.4 });

		// Keep options that fuzzy-match the search term
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	const customFilter = (option, inputValue) => {
		// If search is empty → show all
		if (!inputValue) return true;

		// Fuse.js fuzzy search across labels
		const fuse = new Fuse(allItems, { keys: ["label"], threshold: 0.4 });

		// Keep options that fuzzy-match the search term
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	const canAddMore = requests.every((r) => r.requester?.userId && r.addedDate && r.items.every((i) => i.quantity && i.item?.value));

	//  Submit validation
	const canSubmit = canAddMore; // since it's the same rule for "everything filled"

	const submit = async (e) => {
		e.preventDefault();
		try {
			const inputs = requests.map((r) => ({
				addedDate: r.addedDate,
				description: r.description || null,
				items: r.items.map((i) => ({
					quantity: parseInt(i.quantity),
					itemName: i?.item?.value,
					color: i?.color || null,
					side: i?.side || null,
					size: i?.size || null,
					itemDescription: i?.itemDescription || null,
				})),
				requester: r.requester,
			}));

			console.log("this is the input that are send  ", inputs);

			await createNewMaterialRequests({
				variables: { inputs },
				onCompleted: (res) => {
					console.log("Mutation success:", res.createMultipleMaterialRequests);
					// newMr =
					// navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
				},
				onError: (err) => {
					console.warn("Mutation success:", err);
					// newMr =
					// navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
				},
			});
		} catch (err) {
			console.error("Submit error:", err);
		}
	};

	return (
		<div className="update-container">
			{/* Simple navigation/test links */}
			<form onSubmit={submit} className="update-form">
				{/* Dynamic rows */}
				{requests.map((req, reqIdx) => (
					<div key={reqIdx} className="request-block">
						<h3>Request {reqIdx + 1}</h3>
						{/* Inside your Select:*/}

						<div className="update-form-wrapper">
							<Select
								options={userOptions}
								value={requests[reqIdx]?.requester ? userOptions.find((opt) => opt.value.userId === requests[reqIdx].requester.userId) : null}
								onChange={(selected) =>
									handleRequestChange(
										reqIdx,
										"requester",
										selected ? selected.value : null //  full object goes into your state
									)
								}
								filterOption={customUserFilter}
								placeholder="Select Requester"
								isClearable
								isSearchable
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

							{/* Request-level fields */}
							<input type="date" value={req.date} onChange={(e) => handleRequestChange(reqIdx, "addedDate", e.target.value)} />
							{/* <textarea value={req.description} onChange={(e) => handleRequestChange(reqIdx, "description", e.target.value)} placeholder="Request Description" /> */}

							{/* Items inside request */}
							{req.items.map((row, rowIdx) => {
								const filteredItems = row?.brand?.value ? allItems?.filter((i) => i?.brand === row?.brand?.value) : allItems;

								return (
									<div key={rowIdx} className="update-form-row">
										{/* Brand select */}
										<Select
											options={brands}
											value={row.brand}
											onChange={(val) => handleItemChange(reqIdx, rowIdx, "brand", val)}
											placeholder="Select Brand"
											isClearable
											isSearchable
											styles={{
												control: (base) => ({
													...base,
													borderRadius: "12px",
													borderColor: "blue",
													width: "200px",
													height: "50px",
												}),
												option: (base, state) => ({
													...base,
													backgroundColor: state.isFocused ? "lightblue" : "white",
													color: "black",
												}),
											}}
										/>

										{/* Quantity */}
										<input type="number" value={row.quantity} onChange={(e) => handleItemChange(reqIdx, rowIdx, "quantity", e.target.value)} placeholder="Qty" min={0} />

										{/* Item select */}
										<Select
											options={filteredItems}
											value={row.item}
											onChange={(val) => handleItemChange(reqIdx, rowIdx, "item", val)}
											placeholder="Select Item"
											filterOption={customFilter}
											isClearable
											isSearchable
											styles={{
												control: (base) => ({
													...base,
													borderRadius: "12px",
													borderColor: "blue",
													// width: "200px",
													// height: "50px",
												}),
												option: (base, state) => ({
													...base,
													backgroundColor: state.isFocused ? "lightblue" : "white",
													color: "black",
												}),
											}}
										/>

										{/* Color select */}
										<Select
											options={colorOptions}
											value={colorOptions.find((opt) => opt.value === row.color)}
											onChange={(val) => handleItemChange(reqIdx, rowIdx, "color", val?.value || null)}
											placeholder="Select Color"
											styles={{
												control: (base) => ({
													...base,
													borderRadius: "12px",
													borderColor: "blue",
													// width: "200px",
													// height: "50px",
												}),
												option: (base, state) => ({
													...base,
													backgroundColor: state.isFocused ? "lightblue" : "white",
													color: "black",
												}),
											}}
											formatOptionLabel={(option) => (
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<div style={{ width: "30px", height: "30px", backgroundColor: option.hex, border: "1px solid #ccc" }} />
													<span>{option.label}</span>
												</div>
											)}
										/>

										{/* Side select */}
										<Select
											options={sideOptions}
											value={sideOptions.find((opt) => opt.value === row.side)}
											onChange={(val) => handleItemChange(reqIdx, rowIdx, "side", val?.value || null)}
											placeholder="Select Side/Hand"
											filterOption={customFilter}
											isClearable
											isSearchable
											styles={{
												control: (base) => ({
													...base,
													borderRadius: "12px",
													borderColor: "blue",
													// width: "200px",
													// height: "50px",
												}),
												option: (base, state) => ({
													...base,
													backgroundColor: state.isFocused ? "lightblue" : "white",
													color: "black",
												}),
											}}
										/>

										{/* Size select */}
										<Select
											options={sizeOptions}
											value={sizeOptions.find((opt) => opt.value === row.size)}
											onChange={(val) => handleItemChange(reqIdx, rowIdx, "size", val?.value || null)}
											placeholder="Select Size"
											filterOption={customFilter}
											isClearable
											isSearchable
											styles={{
												control: (base) => ({
													...base,
													borderRadius: "12px",
													borderColor: "blue",
													// width: "200px",
													// height: "50px",
												}),
												option: (base, state) => ({
													...base,
													backgroundColor: state.isFocused ? "lightblue" : "white",
													color: "black",
												}),
											}}
										/>

										{/* Item description */}
										<textarea type="text" value={row.itemDescription} onChange={(e) => handleItemChange(reqIdx, rowIdx, "itemDescription", e.target.value)} placeholder="description for the item" cols={40} rows={10} />

										{/* Remove item button */}
										{req.items.length > 1 && (
											<button type="button" onClick={() => removeItemRow(reqIdx, rowIdx)}>
												Remove Item
											</button>
										)}
									</div>
								);
							})}
						</div>

						{/* Item-level add button */}
						<button type="button" onClick={() => addItemRow(reqIdx)} disabled={!canAddMore}>
							+ Add Item
						</button>
						{/* Remove whole request */}
						{requests.length > 1 && (
							<button type="button" onClick={() => removeRequest(reqIdx)}>
								Remove Request
							</button>
						)}
					</div>
				))}

				{/* Add a whole new request */}
				<button type="button" onClick={addRequest} disabled={!canAddMore}>
					+ Add New Request
				</button>
				<button type="submit" onClick={submit} disabled={!canSubmit}>
					Submit
				</button>

				{!canAddMore && <p style={{ color: "red" }}> All required fields must be filled.</p>}
			</form>
		</div>
	);
}
