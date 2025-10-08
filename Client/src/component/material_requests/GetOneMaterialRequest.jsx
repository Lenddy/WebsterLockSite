import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_one_material_request } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation, Navigate, useNavigate } from "react-router-dom";
import UpdateOneMaterialRequest from "./UpdateOneMaterialRequest";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import Select from "react-select";
import Fuse from "fuse.js";

export default function GetOneMaterialRequest({ userToken }) {
	const { requestId } = useParams();
	const location = useLocation();
	const currentRoutePath = location.pathname;
	const navigate = useNavigate();

	const [rows, setRows] = useState([{ brand: null, item: null, quantity: "", itemDescription: "", color: null, side: null, size: null }]);
	const [logUser, setLogUser] = useState({});
	const [itemGroups, setItemGroups] = useState([]);
	const [mRequest, setMRequest] = useState({});

	const { error, loading, data, refetch } = useQuery(get_one_material_request, { variables: { id: requestId } });
	const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_item_groups);

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

	// Build list of all items, each labeled "Brand - ItemName"
	const allItems = itemGroups?.flatMap((group) =>
		group?.itemsList?.map((item) => ({
			label: `${group.brand} - ${item.itemName}`, // how it shows in the dropdown
			value: `${group.brand} - ${item.itemName}`, // what we send back
			brand: group.brand, // keep track of which brand this item belongs to
		}))
	);

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		// if (loading) console.log("loading");
		// if (iGLoading) console.log("loading");

		if (data) {
			const req = data.getOneMaterialRequest;
			setMRequest({ mrId: req.id, requester: req.requester });
			// Prefill rows with the request’s items
			setRows(
				req.items.map((item) => {
					const matchedItem = allItems.find((i) => i.value === item.itemName);
					const matchedColor = colorOptions.find((i) => i.value === item.color);
					const matchedSide = sideOptions.find((i) => i.value === item.side);
					const matchedSize = sizeOptions.find((i) => i.value === item.size);
					console.log("color", matchedColor, "\n", "side", matchedSide, "\n", "size", matchedSize);

					return {
						id: item.id,
						quantity: item.quantity,
						item: matchedItem || { label: item.itemName, value: item.itemName }, // fallback if not found
						itemDescription: item.itemDescription ? item.itemDescription : "",
						color: matchedColor || { label: item?.color, value: item?.color },
						side: matchedSide || { label: item?.side, value: item?.side },
						size: matchedSize || { label: item?.size, value: item?.size },
					};
				})
			);
		}

		if (iGData) {
			setItemGroups(iGData?.getAllItemGroups || []);
		}

		if (iGError) {
			console.log("there was an error", iGError);
		}

		if (iGError) {
			console.log("there was an error", iGError);
		}
	}, [iGLoading, iGData, iGError, data, loading, itemGroups]);

	return (
		<>
			{currentRoutePath === `/material/request/${requestId}/update` ? (
				<UpdateOneMaterialRequest requestId={requestId} userToken={userToken} />
			) : loading ? (
				<div>
					<h1>loading...</h1>
				</div>
			) : (
				<div className="update-container">
					<div className="update-form">
						{/* <h className="update-form-title">  </h/1> */}
						{/* Dynamic rows */}
						<div className="update-form-wrapper">
							{rows?.map((row, idx) => {
								// Items to display:

								return (
									<div className={`update-form-row `} key={idx}>
										{/* Brand select */}
										<h3 className="form-row-count">Material Request Row {idx + 1}</h3>

										{/* this top */}
										{/* <label htmlFor=""> quantity and item</label> */}
										<div className={` form-row-top-container material-request ${row?.action?.toBeDeleted ? "disabled" : ""}`}>
											<div className="form-row-top-left  material-request">
												{/* Quantity input */}
												<label htmlFor=""> Quantity</label>
												<input type="number" value={row.quantity} min={1} placeholder={loading ? "loading" : "Qty"} disabled={true} />
											</div>

											<div className="form-row-top-right  material-request">
												<label htmlFor=""> Item</label>
												{/* Item select */}
												<Select
													className="form-row-top-select"
													value={row.item}
													placeholder={loading ? "loading" : "Select Item"}
													isDisabled={true}
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
												<div className="form-row-center-container-material-request-wrapper-top">
													{/* <div></div> */}
													<label htmlFor="color"> color </label>
													<Select
														className="form-row-center-material-request-select"
														classNamePrefix="material-request-color-select"
														// colorOptions.find((opt) => opt.value === row.color)
														value={row.color}
														placeholder={loading ? "loading" : "Color"}
														isDisabled={true}
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
															value={row.side}
															placeholder={loading ? "loading" : "Side/Hand"}
															isDisabled={true}
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
														<label htmlFor=""> Size</label>

														<Select
															className="form-row-top-select"
															value={row.size}
															placeholder={loading ? "loading" : "Size"}
															isDisabled={true}
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

											<div className="form-row-center-container-material-request-wrapper-bottom">
												<label htmlFor=""> description</label>

												<textarea type="text" value={row.itemDescription} placeholder={loading ? "loading" : "description for the item"} disabled={true} />
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{jwtDecode(userToken).permissions.canEditUsers && (
							<div className="form-action-btn">
								<div>
									<Link to={`/material/request/${requestId}/update`}>
										<button className="form-submit-btn" type="button" disabled={loading}>
											Review
										</button>
									</Link>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}
