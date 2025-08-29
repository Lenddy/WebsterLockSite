import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { get_all_Item_Groups } from "../../../graphQL/queries/queries";
import { create_One_Material_Request } from "../../../graphQL/mutations/mutations";
import Select from "react-select";
import Fuse from "fuse.js";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

export default function CreateOneMaterialRequest() {
	// const [info, setInfo] = useState({});
	const [rows, setRows] = useState([{ brand: null, item: null, quantity: "", itemDescription: "", color: null, side: null, size: null }]);

	const navigate = useNavigate();
	const [NewMaterialRequest] = useMutation(create_One_Material_Request);

	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_Item_Groups);
	const [itemGroups, setItemGroups] = useState([]);

	const [logUser, setLogUser] = useState({});

	// const [color, setColor] = useState([
	// 	{ value: "605/US3 - Bright Brass", label: "605/US3 - Bright Brass" },
	// 	{ value: "612/US10 - Satin Bronze", label: "612/US10 - Satin Bronze" },
	// 	{ value: "619/US15 - Satin Nickel", label: "619/US15 - Satin Nickel" },
	// 	{ value: "625/US26 - Bright Chrome", label: "625/US26 - Bright Chrome" },
	// 	{ value: "626/US26D - Satin Chrome", label: "626/US26D - Satin Chrome" },
	// 	{ value: "630/US32D - Satin Stainless Steel", label: "630/US32D - Satin Stainless Steel" },
	// 	{ value: "622/ - Black", label: "622/ - Black" },
	// 	{ value: "689/ - Aluminum", label: "689/ - Aluminum" },
	// ]);

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

	// ---------------------------
	// Effect: fetch itemGroups from GraphQL query
	// ---------------------------
	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (iGLoading) console.log("loading");

		if (iGData) {
			// console.log("this are the itemGroups", iGData?.getAllItemGroups || []);
			// store the fetched groups so we can build brands and items
			setItemGroups(iGData?.getAllItemGroups || []);
		}

		if (iGError) {
			console.log("there was an error", iGError);
		}
		// const fetchData = async () => {
	}, [iGLoading, iGData, iGError]);

	// ---------------------------
	// Build list of unique brands
	// ---------------------------

	// const brands = itemGroups.map((ig) => {
	// 	return ig;
	// });

	// console.log("this are all the brands", brands);

	const brands = [...new Set(itemGroups?.map((g) => g.brand))]?.map((b) => ({
		label: b,
		value: b,
	}));

	// ---------------------------
	// Build list of all items, each labeled "Brand - ItemName"
	// ---------------------------

	const allItems = itemGroups?.flatMap((group) =>
		group?.itemsList?.map((item) => ({
			// return item;

			label: `${group.brand} - ${item.itemName}`, // how it shows in the dropdown
			value: `${group.brand} - ${item.itemName}`, // what we send back
			brand: group.brand, // keep track of which brand this item belongs to
		}))
	);

	// console.log("this are all the items", allItems);

	// ---------------------------
	// Custom fuzzy search filter
	// ---------------------------
	const customFilter = (option, inputValue) => {
		// If search is empty → show all
		if (!inputValue) return true;

		// Fuse.js fuzzy search across labels
		const fuse = new Fuse(allItems, { keys: ["label"], threshold: 0.4 });

		// Keep options that fuzzy-match the search term
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	// ---------------------------
	// Handle row value change
	// ---------------------------
	const handleRowChange = (index, field, value) => {
		/**
		 * Steps:
		 * 1. Clone the current rows (since state should not be mutated directly).
		 * 2. Update the specific field (brand, item, or quantity) for the selected row.
		 * 3. Save updated rows back into state.
		 */
		const newRows = [...rows];
		newRows[index][field] = value;
		setRows(newRows);
	};

	{
		// ---------------------- POINTERS ---------------------- //
		// 🔹 Where to use addRow: attach it to your "Add Row" button onClick
		//    Example: <button onClick={addRow}>Add Row</button>
		//
		// 🔹 Where to use removeRow: attach it to a "Remove Row" button per row
		//    Example: <button onClick={() => removeRow(index)}>Remove</button>
		//
		// 🔹 Where rows are rendered: map over rows state to build UI
		//    Example: rows.map((row, index) => ( ... your brand + item selects ... ))
		//
		// 🔹 Where selects go: inside the map for each row, replace 'brand' & 'item' with your Select components
		//    You'll handle search, filtering, and values inside those
		//
		// 🔹 Where submission uses rows: when building your final info object for GraphQL mutation,
		//    include rows as part of the payload (you'll handle how).
		//
		// 🔹 Important: Don't forget keys when mapping rows for React rendering
		// ------------------------------------------------------- //
	}

	/**
	 
	 * Adds a new row to the rows state.
	 * Each row contains a 'brand' and an 'item'.
	 * Both are initialized to null so the user can choose them later.
	 */

	// ---------------------------
	// Add a new row
	// ---------------------------
	const addRow = () => {
		/**
		 * Steps:
		 * 1. Copy the current rows.
		 * 2. Append a new row with default null/empty values.
		 * 3. Save updated rows into state.
		 */
		setRows([...rows, { brand: null, item: null, quantity: "", itemDescription: "", color: null, side: null, size: null }]);
	};

	// --- inside your component CreateOneMaterialRequest --- //

	/**
	 * Removes a row at the specified index.
	 * Useful if the user wants to delete an item line before submitting.
	 *
	 * @param {number} index - The index of the row to remove.
	 */
	const removeRow = (index) => {
		setRows((prevRows) => prevRows.filter((_, i) => i !== index));
	};

	// ---------------------------
	// Submit data to backend
	// ---------------------------
	const submit = async (e) => {
		/**
		 * Steps:
		 * 1. Build the "items" array in the shape required by GraphQL:
		 *    - quantity → integer (or null if empty)
		 *    - itemName → always "Brand - Item" (comes from dropdown value)
		 *    - color/side/size → left null for now
		 * 2. Wrap into final input object with description.
		 * 3. Send mutation with input data.
		 * 4. Navigate away (or show success message).
		 */
		e.preventDefault();
		try {
			const input = {
				items: rows.map((r) => ({
					quantity: parseInt(r.quantity),
					// quantity: r.quantity,
					itemName: r?.item?.value || null,
					color: r?.color || null,
					side: r?.side || null,
					size: r?.size || null,
					itemDescription: r?.itemDescription || null,
				})),
				// addedDate: dayjs().format("YYYY-MM-DD"), // include today's date if needed
			};

			console.log("this is the input that are send  ", input);

			await NewMaterialRequest({
				variables: { input },
				onCompleted: (res) => {
					console.log("Mutation success:", res?.createOneMaterialRequest);
					// newMr =
					navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
				},
			});
		} catch (err) {
			console.error("Submit error:", err);
		}
	};

	console.log("this are the rows", rows);

	return (
		<div>
			{/* Simple navigation/test links */}
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
			<form onSubmit={submit}>
				{/* Dynamic rows */}
				{rows?.map((row, idx) => {
					// Items to display:
					// - If brand is selected → filter down to that brand
					// - If no brand is selected → show ALL items
					const filteredItems = row.brand?.value ? allItems?.filter((i) => i?.brand === row.brand.value) : allItems;

					return (
						<div key={idx} className="">
							{/* Brand select */}
							<Select
								options={brands}
								value={row.brand}
								onChange={(val) => handleRowChange(idx, "brand", val)}
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

							{/* Quantity input */}
							<input type="number" value={row.quantity} onChange={(e) => handleRowChange(idx, "quantity", e.target.value)} placeholder="Qty" />

							{/* Item select */}
							<Select
								options={filteredItems}
								value={row.item}
								onChange={(val) => handleRowChange(idx, "item", val)}
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

							<Select
								options={colorOptions}
								value={colorOptions.find((opt) => opt.value === row.color)}
								onChange={(val) => handleRowChange(idx, "color", val?.value || null)}
								placeholder="Select Color"
								isClearable
								isSearchable
								styles={{
									control: (base) => ({
										...base,
										borderRadius: "12px",
										borderColor: "blue",
									}),
									option: (base, state) => ({
										...base,
										backgroundColor: state.isFocused ? "lightblue" : "white",
										color: "black",
									}),
								}}
								//  This custom renderer shows the swatch + label
								formatOptionLabel={(option) => (
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<div
											style={{
												width: "30px",
												height: "30px",
												backgroundColor: option.hex,
												border: "1px solid #ccc",
											}}
										/>
										<span>{option.label}</span>
									</div>
								)}
							/>

							{/* Item select */}
							<Select
								options={sideOptions}
								value={sideOptions.find((opt) => opt.value === row.side)}
								onChange={(val) => handleRowChange(idx, "side", val?.value || null)}
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

							<Select
								options={sizeOptions}
								value={sizeOptions.find((opt) => opt.value === row.size)}
								onChange={(val) => handleRowChange(idx, "size", val?.value || null)}
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

							{/* Description input */}
							<textarea type="text" value={row.itemDescription} onChange={(e) => handleRowChange(idx, "itemDescription", e.target.value)} placeholder="description for the item" cols={40} rows={10} />

							{rows.length > 1 ? (
								<button type="button" onClick={() => removeRow(idx)}>
									remove
								</button>
							) : null}
						</div>
					);
				})}

				{/* Action buttons */}
				<button type="button" onClick={addRow}>
					+ Add Item
				</button>
				<button type="submit" onClick={submit}>
					Submit
				</button>
			</form>
		</div>
	);
}
