// // !!!!!!!!!!!!!!!!!!!!!!!!!!!
// // !!!!!!!!!!!!!!!!!!!!!!!!!!!
// // what is this for?
// // !!!!!!!!!!!!!!!!!!!!!!!!!!!
// // !!!!!!!!!!!!!!!!!!!!!!!!!!!

// import { create_One_Material_Request } from "../../../graphQL/mutations/mutations";
// import { useMutation, useQuery } from "@apollo/client";
// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import Select from "react-select";
// import Fuse from "fuse.js";
// import dayjs from "dayjs";

// import { get_all_item_groups } from "../../../graphQL/queries/queries";
// import { useTranslation } from "react-i18next";

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

// 	const t = useTranslation();

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
// 				// console.log(" Registered user:", res.data.registerUser);
// 				navigate(`/user/${res.data.registerUser.id}`);
// 			})
// 			.catch((err) => {
// 				// console.error(" Error registering:", err);
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
// 			<h1>t() Material Request </h1>

// 			<div>
// 				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
// 					t() Log out
// 				</Link>
// 			</div>

// 			<div>
// 				<Link to={"/user/all"}>t() all users</Link>
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
