import React from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import Select from "react-select";
import Fuse from "fuse.js";
import { Link, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import { get_one_material_request } from "../../../graphQL/queries/queries";
import { update_One_Material_Request } from "../../../graphQL/mutations/mutations";

function UpdateOneMaterialRequest({ userToken }) {
	//   to pass in ass a prop for later { requestId }
	// const [info, setInfo] = useState({});

	const { requestId } = useParams();
	const [rows, setRows] = useState([{ brand: null, item: null, quantity: "", itemDescription: "", color: null, side: null, size: null }]);

	const navigate = useNavigate();
	const [updatedMaterialRequest, { loading, error }] = useMutation(update_One_Material_Request);

	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_item_groups);
	const [itemGroups, setItemGroups] = useState([]);

	const { error: mRError, loading: mRLoading, data: mRData, refetch } = useQuery(get_one_material_request, { variables: { id: requestId } });

	const [logUser, setLogUser] = useState({});

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

	// ---------------------------
	// Effect: fetch itemGroups from GraphQL query
	// ---------------------------
	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (mRLoading) console.log("loading");
		if (iGLoading) console.log("loading");

		if (mRData) {
			const req = mRData.getOneMaterialRequest;
			console.log("material request", req);
			// Prefill rows with the request’s items
			setRows(
				req.items.map((item) => {
					const matchedItem = allItems.find((i) => i.value === item.itemName);

					return {
						id: item.id,
						quantity: item.quantity,
						item: matchedItem || { label: item.itemName, value: item.itemName }, // fallback if not found
						itemDescription: item.itemDescription ? item.itemDescription : "",
						color: item.color,
						side: item.side,
						size: item.size,
					};
				})
			);
		}

		if (iGData) {
			// console.log("this are the itemGroups", iGData?.getAllItemGroups || []);
			// store the fetched groups so we can build brands and items
			setItemGroups(iGData?.getAllItemGroups || []);
		}

		if (iGError) {
			console.log("there was an error", iGError);
		}

		if (iGError) {
			console.log("there was an error", iGError);
		}
		// const fetchData = async () => {
	}, [iGLoading, iGData, iGError, mRData, mRLoading, itemGroups]);

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

	// console.log("this are all the items", allItems);

	// ---------------------------
	// Custom fuzzy search filter
	// ---------------------------
	const customFilter = (option, inputValue) => {
		// If search is empty → show all
		if (!inputValue) return true;

		// Fuse.js fuzzy search across labels
		const fuse = new Fuse(allItems, { keys: ["label"], threshold: 0.3 });

		// Keep options that fuzzy-match the search term
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	// ---------------------------
	// Handle row value change
	// ---------------------------
	// const handleRowChange = (index, field, value) => {
	// 	/**
	// 	 * Steps:
	// 	 * 1. Clone the current rows (since state should not be mutated directly).
	// 	 * 2. Update the specific field (brand, item, or quantity) for the selected row.
	// 	 * 3. Save updated rows back into state.
	// 	 */
	// 	const newRows = [...rows];

	// 	// Special case: quantity should never be <= 0

	// 	if (field === "quantity") {
	// 		if (value === "") {
	// 			// allow empty while typing
	// 			newRows[index][field] = "";
	// 		} else {
	// 			let parsed = parseInt(value, 10);

	// 			if (isNaN(parsed)) {
	// 				newRows[index][field] = "";
	// 			} else if (parsed === 0) {
	// 				// no zeros → force to 1
	// 				newRows[index][field] = 1;
	// 			} else {
	// 				// remove minus sign
	// 				newRows[index][field] = Math.abs(parsed);
	// 			}
	// 		}
	// 	} else {
	// 		newRows[index][field] = value;
	// 	}

	// 	setRows(newRows);
	// };

	const handleRowChange = (index, field, value) => {
		const newRows = [...rows];
		const row = { ...newRows[index] };

		if (field === "quantity") {
			let parsed = parseInt(value, 10);
			row.quantity = isNaN(parsed) || parsed <= 0 ? "" : Math.abs(parsed);
		} else {
			row[field] = value;
		}

		// Mark as updated if it already exists in DB
		if (row.id && !row?.action?.toBeDeleted) {
			row.action = { ...row?.action, toBeUpdated: true };
		}

		newRows[index] = row;
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
		setRows([...rows, { brand: null, item: null, quantity: "", action: { toBeAdded: true } }]);
	};

	// --- inside your component CreateOneMaterialRequest --- //

	/**
	 * Removes a row at the specified index.
	 * Useful if the user wants to delete an item line before submitting.
	 *
	 * @param {number} index - The index of the row to remove.
	 */
	const removeRow = (index) => {
		// setRows((prevRows) => prevRows.filter((_, i) => i !== index));

		setRows((prevRows) => {
			const newRows = [...prevRows];
			const row = newRows[index];

			if (row?.id) {
				// Existing DB item → toggle delete/undo
				newRows[index] = {
					...row,
					action: {
						...row?.action,
						toBeDeleted: !row?.action?.toBeDeleted, // toggle
					},
				};
			} else {
				// New row not saved yet → just drop it
				newRows.splice(index, 1);
			}

			return newRows;
		});
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
					id: r.id,
					quantity: parseInt(r.quantity),
					itemName: r?.item?.value,
					color: r?.color || null,
					side: r?.side || null,
					size: r?.size || null,
					itemDescription: r?.itemDescription || null,
					action: r.action,
				})),
				approvalStatus: {
					approvedBy: {
						userId: jwtDecode(userToken).userId,
						name: jwtDecode(userToken).name,
						email: jwtDecode(userToken).email,
					},
					approvedAt: new Date(),
					isApproved: true,
				},
			};

			console.log("this is the input that are send  ", input);

			console.log("updatedInputs", input);

			await updatedMaterialRequest({
				variables: { id: requestId, input },
				onCompleted: (res) => {
					console.log("Mutation success:", res?.updateOneMaterialRequest);
					// navigate(`/material/request/${res?.updateOneMaterialRequest?.id}`);
				},
			});
		} catch (err) {
			console.error("Submit error:", err);
		}
	};

	console.log("this are the rows", rows);

	const isFormValid = rows.every((r) => r.item && r.quantity !== "" && Number(r.quantity) > 0);

	return (
		<div className="update-container ">
			{/* <h1> this is the update material </h1>
			<h1> {requestId} </h1> */}

			<form className="update-form" onSubmit={submit}>
				<h1 className="update-form-title"> Update </h1>
				{/* Dynamic rows */}
				<div className="update-form-wrapper">
					{rows?.map((row, idx) => {
						// Items to display:
						// - If brand is selected → filter down to that brand
						// - If no brand is selected → show ALL items

						const filteredItems = row.brand?.value ? allItems?.filter((i) => i?.brand === row.brand.value) : allItems;

						return (
							<div className={`update-form-row `} key={idx}>
								{/* Brand select */}
								<h3 className="form-row-count">Material Request Row {idx + 1}</h3>
								<div className={`form-row-material-request-item-filter ${row?.action?.toBeDeleted ? "disabled" : ""}`}>
									<label htmlFor=""> Filter By Brand</label>
									<Select
										// className="form-row-top-select"
										classNamePrefix={"update-form-row-select"}
										options={brands}
										value={row.brand}
										onChange={(val) => handleRowChange(idx, "brand", val)}
										placeholder="Filter By Brand"
										isClearable
										isSearchable
										isDisabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false}
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
								</div>
								{/* this top */}
								{/* <label htmlFor=""> quantity and item</label> */}
								<div className={` form-row-top-container material-request ${row?.action?.toBeDeleted ? "disabled" : ""}`}>
									<div className="form-row-top-left  material-request">
										{/* Quantity input */}
										<label htmlFor=""> Quantity</label>
										<input type="number" value={row.quantity} onChange={(e) => handleRowChange(idx, "quantity", e.target.value)} min={1} placeholder={mRLoading ? "loading" : "Qty"} disabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false} />
									</div>

									<div className="form-row-top-right  material-request">
										<label htmlFor=""> Item</label>
										{/* Item select */}
										<Select
											className="form-row-top-select"
											options={filteredItems}
											value={row.item}
											onChange={(val) => handleRowChange(idx, "item", val)}
											placeholder={mRLoading ? "loading" : "Select Item"}
											isDisabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false}
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
										/>{" "}
									</div>
								</div>

								<div className={`form-row-center-container-material-request   ${row?.action?.toBeDeleted ? "disabled" : ""}`}>
									<div className="form-row-center-container-material-request-wrapper">
										<div className="form-row-center-container-material-request-wrapper-top">
											{/* <div></div> */}
											<label htmlFor="color"> color </label>
											<Select
												className="form-row-center-material-request-select"
												classNamePrefix="material-request-color-select"
												options={colorOptions}
												value={colorOptions.find((opt) => opt.value === row.color)}
												onChange={(val) => handleRowChange(idx, "color", val?.value || null)}
												placeholder={mRLoading ? "loading" : "Color"}
												isDisabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false}
												isClearable
												isSearchable
												styles={{
													control: (base) => ({
														...base,
														borderRadius: "12px",
														borderColor: "blue",
														width: "100%",
														// maxWidth: "600px",
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
										</div>

										<div className="form-row-center-container-material-request-wrapper-center">
											<div>
												<label htmlFor="">side/hand</label>

												<Select
													className="form-row-top-select"
													options={sideOptions}
													value={sideOptions.find((opt) => opt.value === row.side)}
													onChange={(val) => handleRowChange(idx, "side", val?.value || null)}
													placeholder={mRLoading ? "loading" : "Side/Hand"}
													isDisabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false}
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
											</div>

											<div>
												<label htmlFor=""> Size</label>

												<Select
													className="form-row-top-select"
													options={sizeOptions}
													value={sizeOptions.find((opt) => opt.value === row.size)}
													onChange={(val) => handleRowChange(idx, "size", val?.value || null)}
													placeholder={mRLoading ? "loading" : "Size"}
													isDisabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false}
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
											</div>
										</div>
									</div>

									<div className="form-row-center-container-material-request-wrapper-bottom">
										<label htmlFor=""> description</label>

										<textarea type="text" value={row.itemDescription} onChange={(e) => handleRowChange(idx, "itemDescription", e.target.value)} placeholder={mRLoading ? "loading" : "description for the item"} disabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false} />
									</div>
								</div>
								{row?.action?.toBeDeleted && <p style={{ color: "red" }}> This item is flagged for deletion</p>}
								{rows.length > 1 && (
									<div className="form-row-remove-btn-container">
										<span className="remove-row-btn" type="button" onClick={() => removeRow(idx)}>
											{row?.action?.toBeDeleted ? "Undo Remove" : "Remove"}
										</span>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Action buttons */}
				<div className="form-action-btn">
					<span className="form-add-row-btn" onClick={addRow}>
						+ Add Item
					</span>
					{/* 
					<div >
						<button className="form-comment-btn">Leave Comment</button>
					</div> */}

					<div>
						<button className="form-submit-btn" type="submit" disabled={loading || mRLoading || !isFormValid}>
							Submit
						</button>
					</div>
				</div>
				{!isFormValid && (
					<p className="form-error" style={{ color: "red" }}>
						Please fill out all required fields (Item & Quantity).
					</p>
				)}
			</form>
		</div>
	);
}

export default UpdateOneMaterialRequest;
