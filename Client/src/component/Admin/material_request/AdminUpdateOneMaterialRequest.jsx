import { useEffect, useState, useMemo, useRef } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { get_all_item_groups, get_one_material_request } from "../../../../graphQL/queries/queries";
import { update_One_Material_Request } from "../../../../graphQL/mutations/mutations";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../../graphQL/subscriptions/subscriptions";
import { useParams, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Select from "react-select";
import Fuse from "fuse.js";
import Modal from "../../Modal";
import { useAuth } from "../../../context/AuthContext";
import client from "../../../../graphQL/apolloClient";
import MaterialRequest from "../../../../../Server/models/materialRequest.model";

function AdminUpdateOneMaterialRequest() {
	const { userToken, loading: authLoading } = useAuth();
	const { requestId } = useParams();
	const navigate = useNavigate();
	const skipNextSubAlert = useRef(false);

	const [rows, setRows] = useState([{ brand: null, item: null, quantity: "", itemDescription: "", color: null, side: null, size: null }]);
	const [isOpen, setIsOpen] = useState(false);
	const [mRequest, setMRequest] = useState();
	const [itemGroups, setItemGroups] = useState([]);
	const [requestApproved, setRequestApproved] = useState(false);

	const { data: iGData } = useQuery(get_all_item_groups);
	const { data: mRData, loading: mRLoading } = useQuery(get_one_material_request, {
		variables: { id: requestId },
	});
	const [updatedMaterialRequest, { loading }] = useMutation(update_One_Material_Request);

	// ----- Color / Side / Size options -----
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

	// ----- Memoized items + brands -----
	const allItems = useMemo(
		() =>
			itemGroups?.flatMap((group) =>
				group?.itemsList?.map((item) => ({
					label: `${group.brand} - ${item.itemName}`,
					value: `${group.brand} - ${item.itemName}`,
					brand: group.brand,
				}))
			) || [],
		[itemGroups]
	);

	const brands = useMemo(
		() =>
			[...new Set(itemGroups?.map((g) => g.brand))].map((b) => ({
				label: b,
				value: b,
			})),
		[itemGroups]
	);

	// ----- Load item groups -----
	useEffect(() => {
		if (iGData?.getAllItemGroups) {
			setItemGroups(iGData.getAllItemGroups);
		}
	}, [iGData]);

	useEffect(() => {
		if (mRData?.getOneMaterialRequest) {
			const req = mRData.getOneMaterialRequest;

			setMRequest({
				mrId: req.id,
				requester: req.requester,
			});

			// Only set rows if not already prefilled
			if (rows.length === 1 && !rows[0].id && allItems.length > 0) {
				setRows(
					req.items.map((item) => {
						const matchedItem = allItems.find((i) => i.value === item.itemName);
						const matchedColor = colorOptions.find((i) => i.value === item.color);
						const matchedSide = sideOptions.find((i) => i.value === item.side);
						const matchedSize = sizeOptions.find((i) => i.value === item.size);

						return {
							id: item.id,
							quantity: item.quantity,
							item: matchedItem || { label: item.itemName, value: item.itemName },
							itemDescription: item.itemDescription || "",
							color: matchedColor || { label: item.color, value: item.color },
							side: matchedSide || { label: item.side, value: item.side },
							size: matchedSize || { label: item.size, value: item.size },
						};
					})
				);
			}
		}
	}, [mRData, allItems]);

	// add this sub to the get one material request too

	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			if (skipNextSubAlert.current) {
				skipNextSubAlert.current = false;
				return; // skip alert triggered by your own update
			}

			const change = subscriptionData?.data?.onMaterialRequestChange;
			if (!change) return;

			const { eventType, Changes } = change;
			// console.log("Material Request subscription event:", eventType, Changes);

			if (Changes?.id === requestId) {
				if (eventType === "updated" && Array.isArray(Changes.items)) {
					alert("The material request has been updated");
					setRows(() => {
						//  Map updated items into the same format as the initial useEffect
						return Changes.items.map((item) => {
							const matchedItem = allItems.find((i) => i.value === item.itemName);
							const matchedColor = colorOptions.find((i) => i.value === item.color);
							const matchedSide = sideOptions.find((i) => i.value === item.side);
							const matchedSize = sizeOptions.find((i) => i.value === item.size);

							return {
								id: item.id,
								quantity: item.quantity,
								item: matchedItem || { label: item.itemName, value: item.itemName },
								itemDescription: item.itemDescription || "",
								color: matchedColor || { label: item.color, value: item.color },
								side: matchedSide || { label: item.side, value: item.side },
								size: matchedSize || { label: item.size, value: item.size },
							};
						});
					});
				}

				if (eventType === "deleted") {
					alert("The material request has been deleted. You will be redirected to view all material requests.");
					navigate("/material/request/all");
				}
			}
		},
		onError: (err) => {
			console.error(" Subscription error:", err);
		},
	});

	const handleRowChange = (index, field, value) => {
		const newRows = [...rows];
		const row = { ...newRows[index] };

		if (field === "quantity") {
			let parsed = parseInt(value, 10);
			row.quantity = isNaN(parsed) || parsed <= 0 ? "" : Math.abs(parsed);
		} else {
			row[field] = value;
		}

		if (row.id && !row?.action?.toBeDeleted) {
			row.action = { ...row?.action, toBeUpdated: true };
		}

		newRows[index] = row;
		setRows(newRows);
	};

	// ----- Add / Remove Row -----
	const addRow = () => {
		setRows([...rows, { brand: null, item: null, quantity: "", itemDescription: "", color: null, side: null, size: null, action: { toBeAdded: true } }]);
	};

	const removeRow = (index) => {
		setRows((prevRows) => {
			const newRows = [...prevRows];
			const row = newRows[index];
			if (row?.id) {
				newRows[index] = {
					...row,
					action: { ...row.action, toBeDeleted: !row?.action?.toBeDeleted },
				};
			} else {
				newRows.splice(index, 1);
			}
			return newRows;
		});
	};

	// ----- Fuzzy Search -----
	const customFilter = (option, inputValue) => {
		if (!inputValue) return true;
		const fuse = new Fuse(allItems, { keys: ["label"], threshold: 0.3 });
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	// ----- Submit -----
	const submit = async (e) => {
		e.preventDefault();
		skipNextSubAlert.current = true;
		if (!userToken) return alert("Please log in first.");
		client.clearStore();
		try {
			const decoded = jwtDecode(userToken);
			const requestersID = mRequest?.requester?.userId;
			const input = {
				id: requestId,
				items: rows.map((r) => ({
					id: r.id,
					quantity: parseInt(r.quantity),
					itemName: r?.item?.value,
					color: r?.color?.value || null,
					side: r?.side?.value || null,
					size: r?.size?.value || null,
					itemDescription: r?.itemDescription || null,
					action: r?.action || {},
				})),
				approvalStatus: {
					approvedBy: {
						userId: decoded.userId,
						name: decoded.name,
						email: decoded.email,
						employeeNum: decoded.employeeNum,
						department: decoded.department,
					},
					...(jwtDecode(userToken).userId !== requestersID && { isApproved: true, approvedAt: new Date() }),
				},
				requesterId: requestersID,
			};

			await updatedMaterialRequest({
				variables: { input },
				onCompleted: (res) => {
					// console.log("user update ", jwtDecode(userToken).userId == requestersID);
					// console.log("Mutation success:", res?.updateOneMaterialRequest);
					// console.log("this is the client / caches", client.cache.extract());
					// alert("Material requests have been updated successfully!");
					navigate(`/material/request/${res?.updateOneMaterialRequest?.id}`);
				},
			});
		} catch (err) {
			console.error("Submit error:", err);
		}
	};

	const isFormValid = rows.every((r) => r.item && r.quantity !== "" && Number(r.quantity) > 0);

	if (authLoading || mRLoading) return <p>Loading...</p>;

	const openModal = () => {
		if (!mRequest) {
			alert("Loading request data, please wait...");
			return;
		}
		setIsOpen(true);
	};

	// console.log("request", mRequest?.requester?.userId);

	const canReview = () => {
		const token = jwtDecode(userToken);
		const role = typeof token?.role === "string" ? token?.role : token?.role?.role;

		return ["headAdmin", "admin", "subAdmin"].includes(role);
	};

	console.log("this are the items on the material request rows ,", rows);

	return (
		<div className="update-container">
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
							<div className={`update-form-row`} key={idx}>
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
								<div className={`form-row-top-container material-request ${row?.action?.toBeDeleted ? "disabled" : ""}`}>
									<div className="form-row-top-left material-request">
										{/* Quantity input */}
										<label htmlFor="">Quantity</label>
										<input type="number" value={row.quantity} onChange={(e) => handleRowChange(idx, "quantity", e.target.value)} min={1} placeholder={mRLoading ? "loading" : "Qty"} disabled={mRLoading ? true : row?.action?.toBeDeleted ? true : false} />
									</div>

									<div className="form-row-top-right  material-request">
										<label htmlFor="">Item</label>
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
										<div className="form-row-center-container-material-request-wrapper-center">
											{/* <div></div> */}

											<div>
												<label htmlFor="color"> color </label>
												<Select
													className="form-row-center-material-request-select"
													classNamePrefix="material-request-color-select"
													options={colorOptions}
													// colorOptions.find((opt) => row.color opt.value === )
													value={row.color}
													// onChange={(val) => handleRowChange(idx, "color", val?.value || null)}
													onChange={(val) => handleRowChange(idx, "color", val)}
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
										</div>

										<div className="form-row-center-container-material-request-wrapper-center">
											<div>
												<label htmlFor="">side/hand</label>

												<Select
													className="form-row-top-select"
													options={sideOptions}
													// sideOptions.find((opt) => opt.value === row.side)
													value={row.side}
													// onChange={(val) => handleRowChange(idx, "side", val?.value || null)}
													onChange={(val) => handleRowChange(idx, "side", val)}
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
													// sizeOptions.find((opt) => opt.value === row.size)
													value={row.size}
													// onChange={(val) => handleRowChange(idx, "size", val?.value || null)}
													onChange={(val) => handleRowChange(idx, "size", val)}
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
						<button
							className="form-submit-btn"
							type="button"
							// type="submit"
							disabled={loading || mRLoading || !isFormValid}
							onClick={
								openModal

								// 	() => {
								// 	setIsOpen(true);
								// }
							}>
							{canReview() ? "Approve" : "Update"}
						</button>
					</div>
				</div>
				{!isFormValid && (
					<p className="form-error" style={{ color: "red" }}>
						Please fill out all required fields (Item & Quantity).
					</p>
				)}
				<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} onConFirm={submit} data={{ mRequest, rows }} loading={loading} />
			</form>
		</div>
	);
}

export default AdminUpdateOneMaterialRequest;
