import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { get_all_Item_Groups } from "../../../graphQL/queries/queries";
import { create_One_Material_Request } from "../../../graphQL/mutations/mutations";
import Select from "react-select"; // assuming react-select for search
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";

export default function CreateOneMaterialRequest() {
	const [info, setInfo] = useState({});
	const [rows, setRows] = useState([{ brand: null, item: null, quantity: "" }]);

	const navigate = useNavigate();
	const [NewMaterialRequest] = useMutation(create_One_Material_Request);

	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_Item_Groups);
	const [itemGroups, setItemGroups] = useState([]);

	useEffect(() => {
		if (iGData) {
			setItemGroups(iGData?.getAllItemGroups || []);
		}
	}, [iGData]);

	// Build brand list
	const brands = [...new Set(itemGroups?.map((g) => g.brand))]?.map((b) => ({
		label: b,
		value: b,
	}));

	// Build full item list (with brand prefix)d
	const allItems = itemGroups?.flatMap((group) =>
		group?.items?.map((item) => ({
			label: `${group.brand} - ${item.itemName}`,
			value: `${group.brand} - ${item.itemName}`,
			brand: group.brand,
		}))
	);

	// Fuzzy filter for react-select
	const customFilter = (option, inputValue) => {
		if (!inputValue) return true;
		const fuse = new Fuse(allItems, { keys: ["label"], threshold: 0.3 });
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	// Handle row changes
	const handleRowChange = (index, field, value) => {
		const newRows = [...rows];
		newRows[index][field] = value;
		setRows(newRows);
	};

	const addRow = () => {
		setRows([...rows, { brand: null, item: null, quantity: "" }]);
	};

	const handleSubmit = async () => {
		try {
			const input = {
				items: rows.map((r) => ({
					quantity: parseInt(r.quantity, 10) || null,
					itemName: r.item?.value || null, // already "brand - item"
					color: null,
					side: null,
					size: null,
				})),
				description: info.description || null,
			};

			await NewMaterialRequest({ variables: { createOneMaterialRequestInput2: input } });
			console.log("Submitted:", input);
			navigate("/success");
		} catch (err) {
			console.error("Submit error:", err);
		}
	};

	return (
		<div className="p-4 space-y-4">
			{rows.map((row, idx) => {
				const filteredItems = row.brand?.value ? allItems.filter((i) => i.brand === row.brand.value) : allItems;

				return (
					<div key={idx} className="flex space-x-2 items-center">
						{/* Brand select */}
						<Select options={brands} value={row.brand} onChange={(val) => handleRowChange(idx, "brand", val)} placeholder="Select Brand" isClearable />

						{/* Item select */}
						<Select options={filteredItems} value={row.item} onChange={(val) => handleRowChange(idx, "item", val)} placeholder="Select Item" filterOption={customFilter} isClearable />

						{/* Quantity input */}
						<input type="number" value={row.quantity} onChange={(e) => handleRowChange(idx, "quantity", e.target.value)} placeholder="Qty" className="border p-2 rounded" />
					</div>
				);
			})}

			<button onClick={addRow} className="bg-blue-500 text-white px-4 py-2 rounded">
				+ Add Item
			</button>

			<button onClick={handleSubmit} className="bg-green-500 text-white px-4 py-2 rounded">
				Submit
			</button>
		</div>
	);
}

// import { create_One_Material_Request } from "../../../graphQL/mutations/mutations";
// import { useMutation, useQuery } from "@apollo/client";
// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import Select from "react-select";
// import Fuse from "fuse.js";
// import dayjs from "dayjs";

// import { get_all_Item_Groups } from "../../../graphQL/queries/queries";

// export default function CreateOneMaterialRequest() {
// 	const [info, setInfo] = useState({});
// 	const [permission, setPermission] = useState({});
// 	const [itemGroups, setItemGroups] = useState([]);
// 	const [brands, setBrands] = useState();
// 	const [items, setItems] = useState();

// 	const navigate = useNavigate();
// 	const [NewMaterialRequest, { data, loading, error }] = useMutation(create_One_Material_Request);
// 	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_Item_Groups);

// 	const [rows, setRows] = useState([
// 		{ brand: null, item: null }, // start with one row
// 	]);

// 	useEffect(() => {
// 		if (iGLoading) {
// 			console.log("loading items");
// 		}
// 		if (iGData) {
// 			console.log("items data ", iGData?.getAllItemGroups);
// 			console.log("this are the brands");
// 			// let brands = itemGroups?.map((group) => group.brand);
// 			console.log(brands);
// 			setItemGroups(iGData?.getAllItemGroups);
// 		}
// 		if (iGError) {
// 			console.log("there was an error fetching items", iGError);
// 		}
// 		// const fetchData = async () => {
// 		// 	await refetch();
// 		// };
// 		// fetchData();
// 	}, [iGLoading, iGData, iGError]); //refetch

// 	// Fuzzy search filter
// 	const customFilter = (option, inputValue) => {
// 		if (!inputValue) return true;

// 		const fuse = new Fuse(items, { keys: ["label"], threshold: 0.4 });
// 		return fuse.search(inputValue).some((result) => result.item.value === option.value);
// 	};

// 	// // Function to handle input changes and update state accordingly
// 	const SubmissionInfo = (e) => {
// 		/**
// 		 * Extracts the 'name' and 'value' properties from the event target.
// 		 * Typically used in form input change handlers to identify which input field
// 		 * triggered the event and retrieve its current value.
// 		 *
// 		 * @param {React.ChangeEvent<HTMLInputElement>} e - The event object from the input change.
// 		 * @returns {string} name - The name attribute of the input element.
// 		 * @returns {string} value - The current value of the input element.
// 		 */
// 		const { name, value } = e.target;
// 		setInfo((prev) => {
// 			if (value === "") {
// 				const { [name]: _, ...rest } = prev;
// 				return rest;
// 			}
// 			return { ...prev, [name]: value };
// 		});
// 		// console.log("info to be submitted:", info);
// 	};

// 	// Function to handle form submission
// 	const submit = async (e) => {
// 		e.preventDefault();

// 		await NewMaterialRequest({
// 			variables: {
// 				input: {
// 					name: info.name,
// 					items: info.items,
// 				},
// 			},
// 		})
// 			.then((res) => {
// 				console.log("✅ Registered user:", res.data.registerUser);
// 				navigate(`/user/${res.data.registerUser.id}`);
// 			})
// 			.catch((err) => {
// 				console.error("❌ Error registering:", err);
// 			});
// 	};

// 	const allItems = itemGroups.flatMap((group) =>
// 		group.itemsList.map((item) => ({
// 			value: item.id,
// 			label: item.itemName,
// 			brandId: group.id,
// 		}))
// 	);

// 	const brandOptions = itemGroups.map((group) => ({
// 		value: group.id,
// 		label: group.brand,
// 	}));

// 	const handleBrandChange = (rowIndex, brand) => {
// 		const newRows = [...rows];
// 		newRows[rowIndex].brand = brand;
// 		newRows[rowIndex].item = null; // reset item
// 		setRows(newRows);
// 	};

// 	const handleItemChange = (rowIndex, item) => {
// 		const newRows = [...rows];
// 		newRows[rowIndex].item = item;
// 		setRows(newRows);
// 	};

// 	const addRow = () => {
// 		setRows([...rows, { brand: null, item: null }]);
// 	};

// 	const deleteRow = (rowIndex) => {
// 		setRows(rows.filter((_, i) => i !== rowIndex));
// 	};

// 	return (
// 		<>
// 			{/* {logUser?.name} */}
// 			<h1>Material Request </h1>

// 			<div>
// 				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
// 					Log out
// 				</Link>
// 			</div>

// 			<div>
// 				<Link to={"/user/all"}>all users</Link>
// 			</div>
// 			<div>
// 				<Link to={""}>blank</Link>
// 			</div>

// 			<div>
// 				<form onSubmit={submit}>
// 					<div>
// 						<label htmlFor="addedDead">date</label>

// 						<input
// 							type="date"
// 							name="addedDead"
// 							defaultValue={dayjs().format("YYYY-MM-DD")} // today’s date
// 							onChange={(e) => SubmissionInfo(e)}
// 						/>
// 					</div>

// 					<div>
// 						<div>
// 							<label htmlFor="quantity">Quantity:</label>
// 							<input type="number" name="quantity" onChange={(e) => SubmissionInfo(e)} />
// 						</div>
// 						<span> - </span>
// 						<div>
// 							<label htmlFor="itemName">Item:</label>

// 							<Select name="itemName" options={items} onChange={(selectedOption) => SubmissionInfo({ target: { name: "itemName", value: selectedOption.value } })} filterOption={customFilter} />
// 						</div>
// 					</div>

// 					<div>
// 						<label htmlFor="color">color</label>
// 						<input type="text" name="color" onChange={(e) => SubmissionInfo(e)} />
// 					</div>

// 					<div>
// 						<label htmlFor="side">side/hand</label>
// 						<input type="text" name="side" onChange={(e) => SubmissionInfo(e)} />
// 					</div>

// 					<div>
// 						<label htmlFor="size">size</label>
// 						<input type="text" name="size" onChange={(e) => SubmissionInfo(e)} />
// 					</div>

// 					<div className="validation"> </div>
// 					<button type="submit" disabled={loading}>
// 						{loading ? "Making request  ..." : "Make Request"}
// 					</button>

// 					{error && <p style={{ color: "red" }}>{error.message}</p>}
// 				</form>

// 				<div>
// 					{rows.map((row, index) => {
// 						const filteredItems = row.brand ? allItems.filter((item) => item.brandId === row.brand.value) : allItems;

// 						return (
// 							<div key={index} style={{ marginBottom: "1rem" }}>
// 								{/* Brand */}
// 								<Select
// 									options={brandOptions}
// 									value={row.brand}
// 									onChange={(option) => handleBrandChange(index, option)}
// 									placeholder="Select a brand"
// 									isClearable
// 									isSearchable
// 									styles={{
// 										control: (base) => ({
// 											...base,
// 											borderRadius: "12px",
// 											borderColor: "blue",
// 											width: "200px",
// 											height: "50px",
// 										}),
// 										option: (base, state) => ({
// 											...base,
// 											backgroundColor: state.isFocused ? "lightblue" : "white",
// 											color: "black",
// 										}),
// 									}}
// 								/>

// 								{/* Item */}
// 								<Select
// 									options={filteredItems}
// 									value={row.item}
// 									onChange={(option) => handleItemChange(index, option)}
// 									placeholder="Select an item"
// 									isClearable
// 									isSearchable
// 									styles={{
// 										control: (base) => ({
// 											...base,
// 											borderRadius: "12px",
// 											borderColor: "blue",
// 										}),
// 										option: (base, state) => ({
// 											...base,
// 											backgroundColor: state.isFocused ? "lightblue" : "white",
// 											color: "black",
// 										}),
// 									}}
// 								/>

// 								{/* Delete button (only if more than 1 row) */}
// 								{rows.length > 1 && <button onClick={() => deleteRow(index)}>Delete Row</button>}

// 								{/* Add button (only on last row) */}
// 								{index === rows.length - 1 && <button onClick={addRow}>Add Row</button>}
// 							</div>
// 						);
// 					})}
// 				</div>
// 			</div>
// 		</>
// 	);
// }

// import { create_One_Material_Request } from "../../../graphQL/mutations/mutations";
// import { useMutation, useQuery } from "@apollo/client";
// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import Select from "react-select";
// import Fuse from "fuse.js";

// import { get_all_Item_Groups } from "../../../graphQL/queries/queries";

// import dayjs from "dayjs";
// // { itemGroups }
// export default function MaterialRequestForm() {
// 	const [brandFilter, setBrandFilter] = useState("");
// 	const [items, setItems] = useState([{ quantity: "", itemName: "", color: "", side: "", size: "" }]);
// 	const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));

// 	const [itemGroups, setItemGroups] = useState([]);

// 	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_Item_Groups);

// 	useEffect(() => {
// 		if (iGLoading) {
// 			console.log("loading items");
// 		}
// 		if (iGData) {
// 			console.log("items data ", iGData?.getAllItemGroups);
// 			console.log("this are the brands");
// 			// let brands = itemGroups?.map((group) => group.brand);
// 			// console.log(brands);
// 			setItemGroups(iGData?.getAllItemGroups);
// 		}
// 		if (iGError) {
// 			console.log("there was an error fetching items", iGError);
// 		}
// 		// const fetchData = async () => {
// 		// 	await refetch();
// 		// };
// 		// fetchData();
// 	}, [iGLoading, iGData, iGError]); //refetch

// 	// Filtered items by brand
// 	const filteredItems = brandFilter ? itemGroups.filter((i) => i.brand === brandFilter) : itemGroups;

// 	// Handle input change for a row
// 	const handleChange = (index, field, value) => {
// 		const newItems = [...items];
// 		newItems[index][field] = value;
// 		setItems(newItems);
// 	};

// 	// Add a new row
// 	const addRow = () => {
// 		setItems([...items, { quantity: "", itemName: "", color: "", side: "", size: "" }]);
// 	};

// 	// Delete a row
// 	const deleteRow = (index) => {
// 		if (items.length > 1) {
// 			setItems(items.filter((_, i) => i !== index));
// 		}
// 	};

// 	// Submit request
// 	const handleSubmit = () => {
// 		const payload = {
// 			createOneMaterialRequestInput2: {
// 				items: items.map((it) => ({
// 					...it,
// 					// Build itemName as "Brand - Item"
// 					itemName: it.itemName ? `${filteredItems.find((i) => i.name === it.itemName)?.brand || ""} - ${it.itemName}` : null,
// 				})),
// 				description: "Some description",
// 				date: date,
// 			},
// 		};

// 		console.log("Sending to API:", payload);
// 		// Call your GraphQL mutation here
// 	};

// 	return (
// 		<div>
// 			<div>
// 				<label>Date: </label>
// 				<input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
// 			</div>

// 			<div>
// 				<label>Filter by Brand: </label>
// 				<select onChange={(e) => setBrandFilter(e.target.value)}>
// 					<option value="">All Brands</option>
// 					{[...new Set(itemGroups.map((i) => i.brand))].map((b) => (
// 						<option key={b} value={b}>
// 							{b}
// 						</option>
// 					))}
// 				</select>
// 			</div>

// 			{items.map((row, index) => (
// 				<div key={index}>
// 					<input type="number" placeholder="Quantity" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />

// 					<select value={row.itemName} onChange={(e) => handleChange(index, "itemName", e.target.value)}>
// 						<option value="">Select Item</option>
// 						{filteredItems.map((item) => (
// 							<option key={item.id} value={item.name}>
// 								{item.name}
// 							</option>
// 						))}
// 					</select>

// 					<input placeholder="Color" value={row.color} onChange={(e) => handleChange(index, "color", e.target.value)} />
// 					<input placeholder="Side" value={row.side} onChange={(e) => handleChange(index, "side", e.target.value)} />
// 					<input placeholder="Size" value={row.size} onChange={(e) => handleChange(index, "size", e.target.value)} />

// 					{items.length > 1 && (
// 						<button type="button" onClick={() => deleteRow(index)}>
// 							Delete
// 						</button>
// 					)}

// 					{index === items.length - 1 && (
// 						<button type="button" onClick={addRow}>
// 							Add
// 						</button>
// 					)}
// 				</div>
// 			))}

// 			<button type="button" onClick={handleSubmit}>
// 				Submit
// 			</button>
// 		</div>
// 	);
// }

// !!!!! new code

// import React, { useState } from "react";
// import dayjs from "dayjs";

// export default function MaterialRequestForm({ itemGroups }) {
//   const [brandFilter, setBrandFilter] = useState("");
//   const [items, setItems] = useState([
//     { quantity: "", itemName: "", color: "", side: "", size: "" }
//   ]);
//   const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));

//   // Filtered items by brand
//   const filteredItems = brandFilter
//     ? itemGroups.filter(i => i.brand === brandFilter)
//     : itemGroups;

//   // Handle input change for a row
//   const handleChange = (index, field, value) => {
//     const newItems = [...items];
//     newItems[index][field] = value;
//     setItems(newItems);
//   };

//   // Add a new row
//   const addRow = () => {
//     setItems([...items, { quantity: "", itemName: "", color: "", side: "", size: "" }]);
//   };

//   // Delete a row
//   const deleteRow = (index) => {
//     if (items.length > 1) {
//       setItems(items.filter((_, i) => i !== index));
//     }
//   };

//   // Submit request
//   const handleSubmit = () => {
//     const payload = {
//       createOneMaterialRequestInput2: {
//         items: items.map(it => ({
//           ...it,
//           // Build itemName as "Brand - Item"
//           itemName: it.itemName ? `${filteredItems.find(i => i.name === it.itemName)?.brand || ""} - ${it.itemName}` : null
//         })),
//         description: "Some description",
//         date: date
//       }
//     };

//     console.log("Sending to API:", payload);
//     // Call your GraphQL mutation here
//   };

//   return (
//     <div>
//       <div>
//         <label>Date: </label>
//         <input
//           type="date"
//           value={date}
//           onChange={(e) => setDate(e.target.value)}
//         />
//       </div>

//       <div>
//         <label>Filter by Brand: </label>
//         <select onChange={(e) => setBrandFilter(e.target.value)}>
//           <option value="">All Brands</option>
//           {[...new Set(itemGroups.map(i => i.brand))].map(b => (
//             <option key={b} value={b}>{b}</option>
//           ))}
//         </select>
//       </div>

//       {items.map((row, index) => (
//         <div key={index}>
//           <input
//             type="number"
//             placeholder="Quantity"
//             value={row.quantity}
//             onChange={(e) => handleChange(index, "quantity", e.target.value)}
//           />

//           <select
//             value={row.itemName}
//             onChange={(e) => handleChange(index, "itemName", e.target.value)}
//           >
//             <option value="">Select Item</option>
//             {filteredItems.map(item => (
//               <option key={item.id} value={item.name}>
//                 {item.name}
//               </option>
//             ))}
//           </select>

//           <input
//             placeholder="Color"
//             value={row.color}
//             onChange={(e) => handleChange(index, "color", e.target.value)}
//           />
//           <input
//             placeholder="Side"
//             value={row.side}
//             onChange={(e) => handleChange(index, "side", e.target.value)}
//           />
//           <input
//             placeholder="Size"
//             value={row.size}
//             onChange={(e) => handleChange(index, "size", e.target.value)}
//           />

//           {items.length > 1 && (
//             <button type="button" onClick={() => deleteRow(index)}>Delete</button>
//           )}

//           {index === items.length - 1 && (
//             <button type="button" onClick={addRow}>Add</button>
//           )}
//         </div>
//       ))}

//       <button type="button" onClick={handleSubmit}>Submit</button>
//     </div>
//   );
// }
