import React from "react";

import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import { create_one_material_request } from "../../../graphQL/mutations/mutations";
import Select from "react-select";
import Fuse from "fuse.js";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext"; //  use context
import { List, useDynamicRowHeight } from "react-window";
import { useDebounce } from "use-debounce";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
// import FixedSizeList from "react-window";

// import {FixedSizeList} from "react-window"

export default function CreateOneMaterialRequest() {
	const { userToken, loading: authLoading } = useAuth(); //  use context instead of prop
	const [rows, setRows] = useState([{ brand: "", item: "", quantity: "", itemDescription: "", color: null, side: null, size: null, showOptional: false, showDescription: false }]);
	const [itemGroups, setItemGroups] = useState([]);
	const [logUser, setLogUser] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const [showDoorHanding, setShowDoorHanding] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [formReset, setFormReset] = useState(false);
	const [toastOpen, setToastOpen] = useState(false);
	const [blockInput, setBlockInput] = useState(false);
	const [requestId, setRequestId] = useState("");

	const navigate = useNavigate();
	const [NewMaterialRequest] = useMutation(create_one_material_request);
	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_item_groups);

	const [searchValue, setSearchValue] = useState("");
	const [debouncedSearch] = useDebounce(searchValue, 250); // 250ms debounce

	const [isItemsReady, setIsItemsReady] = useState(false);
	const { t } = useTranslation();

	// const [debouncedSearch] = useDebounce(searchValue, 250); // 250ms delay

	//  Decode token only if it exists and once AuthContext is ready
	useEffect(() => {
		if (!authLoading && userToken) {
			try {
				const decoded = jwtDecode(userToken);
				setLogUser(decoded);
			} catch (err) {
				console.error("Invalid token:", err);
			}
		}
	}, [userToken, authLoading]);

	useEffect(() => {
		if (iGData) setItemGroups(iGData?.getAllItemGroups || []);
		if (iGError) console.log("Error fetching item groups:", iGError);
	}, [iGData, iGError]);

	const colorOptions = [
		{ value: "605/US3 - Bright Brass", label: "605/US3 - Bright Brass", hex: "#FFD700" },
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
			label: `${group.brand} - ${item.itemName}`,
			value: `${group.brand} - ${item.itemName}`,
			brand: group.brand,
		}))
	);

	useEffect(() => {
		if (allItems && allItems.length > 0) {
			setIsItemsReady(true);
		} else {
			setIsItemsReady(false);
		}
	}, [allItems]);

	const handleRowChange = (index, field, value) => {
		setRows((prev) => {
			const updated = [...prev];
			updated[index][field] = value;
			return updated;
		});
	};

	const toggleItemField = (rowIdx, field) => {
		setRows((prev) => {
			if (!prev) return [];
			const updated = [...prev];
			updated[rowIdx] = { ...updated[rowIdx], [field]: !updated[rowIdx][field] };
			return updated;
		});
	};

	const addRow = () => {
		setRows([...rows, { brand: "", item: "", quantity: "", itemDescription: "", color: null, side: null, size: null, showOptional: false, showDescription: false }]);
	};

	const removeRow = (index) => {
		setRows((prev) => prev.filter((_, i) => i !== index));
	};

	console.log("this are the rows", rows);

	const resetForm = () => {
		setRows([{ brand: "", item: "", quantity: "", itemDescription: "", color: null, side: null, size: null, showOptional: false, showDescription: false }]);
		// or your initial requests state
		// setSelectedGroups([]);
		setHasSubmitted(false);
		setFormReset(true);
	};

	const SuccessToast = ({ closeToast, resetForm }) => (
		<div>
			<p>{t("material-request-have-been-requested-successfully")}</p>

			<div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
				<button
					onClick={() => {
						closeToast();
						setBlockInput(false);
						// navigate(`/material/request/${requestId}`);
					}}>
					{t("view-request")}
				</button>

				<button
					onClick={() => {
						resetForm();
						setBlockInput(false);
						// console.log("has submitted before", hasSubmitted);
						setHasSubmitted(false);
						// console.log("has submitted after", hasSubmitted);
						closeToast();
					}}>
					{t("make-another-request")}
				</button>
			</div>

			{/* <p style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>{t("duplicate-request")}</p> */}
		</div>
	);

	// TODO fix the notification  it has to wait until view request is click to takes you to get one request also close the modal when it succeeds/fails (and one little thing it might be because it is so fast but you dont see the making a request notification )
	const submit = async (e) => {
		e.preventDefault();

		if (hasSubmitted === true) {
			toast.warn(t("duplicate-request-warning"), {
				// autoClose: false,
			});
			return;
		}

		const input = {
			items: rows.map((r) => ({
				quantity: parseInt(r.quantity),
				itemName: r?.item?.value || null,
				color: r?.color || null,
				side: r?.side || null,
				size: r?.size || null,
				itemDescription: r?.itemDescription || null,
			})),
		};

		const mutationPromise = NewMaterialRequest({
			variables: { input },
			// onCompleted: (res) => {
			// 	// console.log("Mutation success:", res?.createOneMaterialRequest);
			// 	toast.success(t("Material-has-been-requested-successfully"));
			// 	navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
			// },
		});

		toast.promise(mutationPromise, {
			pending: t("creating-material-request"),

			success: {
				render({ closeToast }) {
					return <SuccessToast closeToast={closeToast} resetForm={resetForm} navigate={navigate} setHasSubmitted={setHasSubmitted} t={t} />;
				},
				autoClose: false,
			},

			error: {
				render({ data }) {
					const err = data;
					if (err?.graphQLErrors?.length) {
						return err.graphQLErrors.map((e) => e.message).join(", ");
					}
					// come here
					if (err?.networkError) return t("network-error-try-again");
					return t("something-went-wrong");
				},
				autoClose: false,
			},
		});
		mutationPromise
			.then((res) => {
				setRequestId(`${res?.createOneMaterialRequest?.id}`);
				setHasSubmitted(true);
				setBlockInput(true);
			})
			.catch(() => {
				setHasSubmitted(false);
			});
	};

	const isFormValid = rows?.every((r) => r?.item && r?.quantity !== "" && Number(r?.quantity) > 0);

	function VirtualizedMenuList({ options, children, maxHeight }) {
		// console.log("maxHeight", maxHeight);
		// console.log("children", children);
		// console.log("children data", children[0]?.props?.data);
		// // console.log("children data", children[0].props.data);
		// console.log("options", options);
		const rowHeight = useDynamicRowHeight({
			defaultRowHeight: 50,
		});
		const itemCount = children.length;

		if (itemCount === 0) {
			return <div style={{ padding: "10px", textAlign: "center", color: "#777" }}>No results found</div>;
		}

		// const childrenArray = React.Children.toArray(children || []);
		// console.log("children array", childrenArray);

		// if (!childrenArray.length || childrenArray.length === 0) {
		// 	// console.log("children array is null ");
		// 	// return null;
		// 	return <div style={{ padding: "10px", textAlign: "center", color: "#777" }}>No results found</div>;
		// }

		// console.log("rendering the list ");
		return (
			<List
				style={{ height: 300, width: "100%", color: "black", textAlign: "center" }}
				// rowCount={children?.length || 0}
				rowCount={children.length || 0}
				rowHeight={rowHeight} //old 35
				rowProps={{}}
				// rowComponent={({ index, style }) => {
				// 	const item = children[index];
				// 	// return <div style={style}>{item ? item.props.data.value : "none"}</div>;
				// 	return <div style={style}>{item}</div>;
				// }}
				rowComponent={({ index, style, rowProps }) => {
					const item = children[index];
					// ?.props?.data?.label
					return <div style={{ ...style, display: "flex", borderBottom: " dashed 1px black" }}>{item}</div>;
				}}
			/>
		);
	}

	const customFilter = (option, inputValue) => {
		if (!inputValue) return true;
		const fuse = new Fuse(allItems, { keys: ["label"], threshold: 0.4 });
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	const filteredAllItems = useMemo(() => {
		console.log("🔍 debouncedSearch:", debouncedSearch);
		console.log("📦 allItems:", allItems);

		if (!debouncedSearch) {
			console.log("➡ Returning all items (no search)");
			return allItems;
		}

		// return fuse.search(inputValue).some((r) => r.item.value === option.value);

		try {
			const fuse = new Fuse(allItems, {
				keys: ["label"],
				threshold: 0.4,
				ignoreLocation: true,
			});
			const results = fuse.search(debouncedSearch);
			// const results = fuse.search(debouncedSearch).some((r) => r.item.value);

			console.log("🎯 Fuse raw results:", results);

			const mapped = results.map((r) => r?.item);
			// const mapped = results.some((r) => r.item);
			console.log("📌 Mapped results:", mapped);

			return mapped;
		} catch (err) {
			console.error("❌ Fuzzy error:", err);
			return allItems;
		}
	}, [allItems, debouncedSearch]);

	//  Handle loading state cleanly
	if (authLoading || iGLoading) return <h1>Loading...</h1>;

	return (
		<div className="update-container">
			<form className="update-form" onSubmit={submit}>
				<h1 className="update-form-title">{t("request-material")}</h1>

				<div className="update-form-wrapper">
					{rows?.map((row, idx) => {
						const filteredItems = row.brand?.value ? filteredAllItems.filter((i) => i.brand === row.brand.value) : filteredAllItems;

						return (
							<div key={idx} className="update-form-row">
								<h3 className="form-row-count">
									{t("material-request-row")} {idx + 1}
								</h3>

								<div className="form-row-material-request-item-filter">
									<label> {t("filter-by-brand")}</label>
									<Select
										options={brands}
										value={row.brand}
										onChange={(val) => handleRowChange(idx, "brand", val)}
										placeholder={t("select-brand")}
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
									/>{" "}
								</div>

								<div className="form-row-top-container material-request">
									<div className="form-row-top-left material-request">
										<label>{t("quantity")}</label>
										<input type="number" value={row.quantity} onChange={(e) => handleRowChange(idx, "quantity", e.target.value)} placeholder={t("qty")} />
									</div>

									<div className="form-row-top-right material-request">
										<label>{t("item")}</label>
										<Select
											className="form-row-top-select"
											options={filteredItems}
											// options={allItems}
											value={row.item}
											onChange={(val) => handleRowChange(idx, "item", val)}
											placeholder={isItemsReady ? t("select-item") : t("loading-items")}
											isDisabled={!isItemsReady}
											// onInputChange={(val, meta) => {
											// 	// console.log("InputChange value:", val, "action:", meta.action);
											// 	if (meta.action === "input-change") {
											// 		setSearchValue(val);
											// 	}
											// }}
											// onInputChange={(val) => setSearchValue(val)} // update debouncedSearch via useDebounce
											inputValue={searchValue}
											onMenuClose={() => setSearchValue("")}
											onInputChange={(val, meta) => {
												if (meta.action === "input-change") {
													setSearchValue(val);
												}
												if (meta.action === "menu-close") {
													setSearchValue("");
												}
											}}
											filterOption={() => true}
											isClearable
											isSearchable
											components={{ MenuList: VirtualizedMenuList }}
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
										/>
									</div>
								</div>

								<div className="form-row-center-container-material-request">
									{row.showOptional && (
										<div className="form-row-center-container-material-request-wrapper">
											<div className="form-row-center-container-material-request-wrapper-center">
												<div>
													<label>Color</label>
													<Select
														className="form-row-center-material-request-select"
														classNamePrefix="material-request-color-select"
														options={colorOptions}
														value={colorOptions.find((opt) => opt.value === row.color)}
														onChange={(val) => handleRowChange(idx, "color", val?.value || null)}
														placeholder={t("select-color")}
														isClearable
														isSearchable
														formatOptionLabel={(option) => (
															<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
																<div style={{ width: "30px", height: "30px", backgroundColor: option.hex, border: "1px solid #ccc" }} />
																<span>{option.label}</span>
															</div>
														)}
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
													/>
												</div>
											</div>

											<div className="form-row-center-container-material-request-wrapper-center">
												<div>
													<label>{t("side")}</label>
													<Select
														className="form-row-top-select"
														options={sideOptions}
														value={sideOptions.find((opt) => opt.value === row.side)}
														onChange={(val) => {
															handleRowChange(idx, "side", val?.value || null), setShowDoorHanding(true);
														}}
														placeholder={t("select-side")}
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
													/>
												</div>

												<div>
													<label>{t("size")}</label>
													<Select
														className="form-row-top-select"
														options={sizeOptions}
														value={sizeOptions.find((opt) => opt.value === row.size)}
														onChange={(val) => handleRowChange(idx, "size", val?.value || null)}
														placeholder={t("select-size")}
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
													/>
												</div>
											</div>
										</div>
									)}

									{row.showDescription && (
										<div className="form-row-center-container-material-request-wrapper-bottom">
											<label>{t("description")}</label>
											<textarea value={row.itemDescription} onChange={(e) => handleRowChange(idx, "itemDescription", e.target.value)} placeholder={t("description-for-the-item")} cols={40} rows={10} />
										</div>
									)}

									<div className="form-action-hidden-fields">
										<span className="show-fields-btn" type="button" onClick={() => toggleItemField(idx, "showOptional")}>
											{row.showOptional ? t("hide-optional-fields") : t("show-optional-fields")}
										</span>

										<span className="show-fields-btn" type="button" onClick={() => toggleItemField(idx, "showDescription")}>
											{row.itemDescription ? (row.showDescription ? t("hide-description") : t("show-description")) : t("add description")}
										</span>
									</div>
								</div>

								{rows.length > 1 && (
									<div className="form-row-remove-btn-container">
										<span className="remove-row-btn" onClick={() => removeRow(idx)}>
											{t("remove")}
										</span>
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="form-action-btn">
					<span className="form-add-row-btn" onClick={addRow}>
						{t("add-item")}
					</span>
					<div>
						<button className="form-submit-btn" type="button" disabled={!isFormValid} onClick={() => setIsOpen(true)}>
							{t("request-material")}
						</button>
					</div>
				</div>

				{/* <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} onConFirm={submit} data={{ rows }} /> */}
				<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} onConFirm={submit} data={{ rows, showDoorHanding }} />
			</form>
		</div>
	);
}
