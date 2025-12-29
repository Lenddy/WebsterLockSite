import React from "react";
import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { get_all_item_groups } from "../../../../graphQL/queries/queries";
import { create_multiple_material_requests } from "../../../../graphQL/mutations/mutations";
// import { get_all_users } from "../../../../graphQL/queries/queries";
import { useUsers } from "../../../context/UsersContext";
import Select from "react-select";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import { List, useDynamicRowHeight } from "react-window";
import { useDebounce } from "use-debounce";
import { useTranslation } from "react-i18next";
import { useItemGroups } from "../../../context/ItemGroupContext";
// const [items, setItems] = useState([]);
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

export default function AdminCreateMultipleMaterialRequests() {
	const { userToken, pageLoading, loading: userLoading } = useAuth();
	const { users, loading, error } = useUsers();
	const { items: itemGroups, loading: iGLoading, error: iGError } = useItemGroups();
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
					showOptional: false,
					showDescription: false,
				},
			],

			requester: {
				userId: "",
				email: "",
				name: "",
				role: "",
				employeeNum: "",
				department: "",
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
	const [createNewMaterialRequests] = useMutation(create_multiple_material_requests);
	const [searchValue, setSearchValue] = useState("");
	const [debouncedSearch] = useDebounce(searchValue, 250); // 250ms debounce
	const [isItemsReady, setIsItemsReady] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [formReset, setFormReset] = useState(false);
	const [toastOpen, setToastOpen] = useState(false);
	const [blockInput, setBlockInput] = useState(false);

	const navigate = useNavigate();
	const { t } = useTranslation();

	const decodedUser = useMemo(() => {
		if (!userToken) return null;
		try {
			return JSON.parse(atob(userToken.split(".")[1])); // simple JWT decode
		} catch (err) {
			console.error("Invalid token", err);
			return null;
		}
	}, [userToken]);

	const canUserReview = useMemo(() => {
		if (!decodedUser) return false;

		const role = typeof decodedUser.role === "string" ? decodedUser.role : decodedUser.role?.role;

		const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
		// const isOwner = decodedUser.userId === userId;

		return hasRole;
	}, [decodedUser]);

	useEffect(() => {
		if (!canUserReview) {
			navigate("/material/request/all", { replace: true });
		}
	}, [canUserReview, navigate]);

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
						showOptional: false,
						showDescription: false,
					},
				],
				requester: {
					userId: "",
					email: "",
					name: "",
					role: "",
					employeeNum: "",
					department: "",
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
			brand: "",
			quantity: "",
			item: null,
			color: null,
			side: null,
			size: null,
			itemDescription: "",
			showOptional: false,
			showDescription: false,
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

	const toggleItemField = (reqIdx, rowIdx, field) => {
		const updated = [...requests];
		updated[reqIdx].items[rowIdx][field] = !updated[reqIdx].items[rowIdx][field];
		setRequests(updated);
	};

	const userOptions = users.map((user) => ({
		label: ` ${user?.employeeNum !== null ? user?.employeeNum : ""} ${user.name} (${user.email})`,
		value: {
			userId: user.id, //  your backend id
			email: user.email,
			name: user.name,
			role: user.role,
			employeeNum: user.employeeNum,
			department: user.department,
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

	useEffect(() => {
		if (allItems && allItems.length > 0) {
			setIsItemsReady(true);
		} else {
			setIsItemsReady(false);
		}
	}, [allItems]);

	// 	useEffect(() => {
	// 	if (hasSubmitted) {
	// 		toast.info(t("duplicate-request-warning"), { autoClose: false });
	// 	}
	// }, [hasSubmitted]);

	const customUserFilter = (option, inputValue = "") => {
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
		return fuse?.search(inputValue)?.some((r) => r?.item?.value === option?.value);
	};

	const resetForm = () => {
		setRequests([
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
						showOptional: false,
						showDescription: false,
					},
				],
				requester: {
					userId: "",
					email: "",
					name: "",
					role: "",
					employeeNum: "",
					department: "",
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
		]); // or your initial requests state
		// setSelectedGroups([]);
		setHasSubmitted(false);
		setFormReset(true);
	};

	let canAddMore = requests?.every((r) => r.requester?.userId && r?.addedDate && r?.items?.every((i) => i?.quantity && i?.item?.value));

	//  Submit validation
	const canSubmit = canAddMore; // since it's the same rule for "everything filled"

	// const SuccessToast = ({ closeToast }) => (
	// 	<div>
	// 		<p>{t("material-requests-have-been-requested-successfully")}</p>

	// 		<div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
	// 			<button
	// 				onClick={() => {
	// 					closeToast();
	// 					navigate("/material/request/all");
	// 				}}>
	// 				{t("go-to-list")}
	// 			</button>

	// 			<button
	// 				onClick={() => {
	// 					resetForm();
	// 					setHasSubmitted(true);
	// 					closeToast();
	// 				}}>
	// 				{t("stay-and-create-another")}
	// 			</button>
	// 		</div>

	// 		<p style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>{t("warning-duplicate-request")}</p>
	// 	</div>
	// );

	// REVIEW -      make the btn works (not brake the page )  and also dont allow a the users to click the submit btn  (see if you can overwrite the state variable on te component settings of the browser)and add the new translation

	//TODO - if a request is made notify the users that is has succeeded/ fail (done )

	//TODO -  if the same requests gets send with not changes dont let the request pass and notify the user that it is a duplicate and it needs to be change (done)

	//TODO - if the users wants to make another request they should not be able to edit their current request nor make another request (not able to edit current request ) until  they click make another request / reload site

	//TODO - if the user wants to see the requests they can navigate to view all requests  when the uses closes the notification or clicks view requests btn

	const SuccessToast = ({ closeToast, resetForm }) => (
		<div>
			<p>{t("material-requests-have-been-requested-successfully")}</p>

			<div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
				<button
					onClick={() => {
						closeToast();
						setBlockInput(false);
						navigate("/material/request/all");
					}}>
					{t("view-all-request")}
				</button>

				<button
					onClick={() => {
						resetForm();
						setBlockInput(false);
						console.log("has submitted before", hasSubmitted);
						setHasSubmitted(false);
						console.log("has submitted after", hasSubmitted);
						closeToast();
					}}>
					{t("make-another-request")}
				</button>
			</div>

			{/* <p style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>{t("duplicate-request")}</p> */}
		</div>
	);

	// const submit = async (e) => {
	// 	e.preventDefault();
	// 	// try {
	// 	const inputs = requests.map((r) => ({
	// 		// addedDate: r.addedDate,
	// 		addedDate: dayjs(r?.addedDate).toISOString(),
	// 		description: r?.description || null,
	// 		items: r?.items.map((i) => ({
	// 			quantity: parseInt(i?.quantity),
	// 			itemName: i?.item?.value,
	// 			color: i?.color || null,
	// 			side: i?.side || null,
	// 			size: i?.size || null,
	// 			itemDescription: i?.itemDescription || null,
	// 		})),
	// 		requester: r.requester,
	// 	}));

	// 	console.log("this is the input that are send  ", inputs);

	// 	const mutationPromise = createNewMaterialRequests({
	// 		variables: { inputs },
	// 	});

	// 	toast.promise(mutationPromise, {
	// 		pending: t("creating-material-request"),
	// 		success: {
	// 			render({ data }) {
	// 				console.log("this is the data from he promise", data);
	// 				//REVIEW - concat the amount (length) from data with the  translation
	// 				return t("material-requests-have-been-requested-successfully");
	// 			},
	// 		},
	// 		error: {
	// 			render({ data }) {
	// 				// Apollo error object
	// 				const err = data;

	// 				// 1️ GraphQL errors array
	// 				if (err?.graphQLErrors?.length) {
	// 					return err.graphQLErrors.map((e) => e.message).join(", ");
	// 				}

	// 				// 2️ Network error
	// 				if (err?.networkError) {
	// 					return t("network-error-try-again");
	// 				}

	// 				// 3️ Fallback
	// 				return t("something-went-wrong");
	// 			},
	// 		},
	// 	});

	// 	// onCompleted: (res) => {
	// 	// 	// console.log("Mutation success on the create multiple:", res.createMultipleMaterialRequests);
	// 	// 	// newMr =
	// 	// 	alert(t("material-requests-have-been-requested-successfully"));
	// 	// 	navigate(`/material/request/all`);
	// 	// },
	// 	// onError: (err) => {
	// 	// 	console.warn("Mutation error:", err);
	// 	// 	// newMr =
	// 	// 	// navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
	// 	// },
	// 	// });

	// 	// } catch (err) {
	// 	// 	console.error("Submit error:", err);
	// 	// }
	// };

	// const [showOptional, setShowOptional] = useState(false);

	// NOTE - the warning is only supposed to show if the form is not clear (shoit like you are doint it now )

	const submit = async (e) => {
		e.preventDefault();

		if (hasSubmitted === true) {
			toast.warn(t("duplicate-request-warning"), {
				// autoClose: false,
			});
			return;
		}

		const inputs = requests.map((r) => ({
			// addedDate: r.addedDate,
			addedDate: dayjs(r?.addedDate).toISOString(),
			description: r?.description || null,
			items: r?.items.map((i) => ({
				quantity: parseInt(i?.quantity),
				itemName: i?.item?.value,
				color: i?.color || null,
				side: i?.side || null,
				size: i?.size || null,
				itemDescription: i?.itemDescription || null,
			})),
			requester: r.requester,
		}));

		// console.log("this is the input that are send  ", inputs);

		const mutationPromise = createNewMaterialRequests({
			variables: { inputs },
		});

		toast.promise(mutationPromise, {
			pending: t("creating-material-request"),
			// {
			// 	render() {
			// 		setToastOpen(true);
			// 		canAddMore = true;
			// 		return t("creating-material-request");
			// 	},
			// },

			// success: {
			// 	render({ data, closeToast }) {
			// 		setToastOpen(false);
			// 		setHasSubmitted(true);
			// 		return <SuccessToast closeToast={closeToast} resetForm={resetForm} />;
			// 	},
			// 	autoClose: false,
			// },

			success: {
				render({ closeToast }) {
					return <SuccessToast closeToast={closeToast} resetForm={resetForm} navigate={navigate} setHasSubmitted={setHasSubmitted} t={t} />;
				},
				autoClose: false,
			},

			// error: {
			// 	render({ data }) {
			// 		const err = data;
			// 		canAddMore = false;
			// 		setToastOpen(false);
			// 		hasSubmitted(false);
			// 		if (err?.graphQLErrors?.length) {
			// 			return err.graphQLErrors.map((e) => e.message).join(", ");
			// 		}

			// 		if (err?.networkError) {
			// 			return t("network-error-try-again");
			// 		}

			// 		return t("something-went-wrong");
			// 	},
			// 	autoClose: false, // required
			// },

			error: {
				render({ data }) {
					const err = data;
					if (err?.graphQLErrors?.length) {
						return err.graphQLErrors.map((e) => e.message).join(", ");
					}
					if (err?.networkError) return t("network-error-try-again");
					return t("something-went-wrong");
				},
				autoClose: false,
			},
		});
		mutationPromise
			.then(() => {
				setHasSubmitted(true);
				setBlockInput(true);
			})
			.catch(() => {
				setHasSubmitted(false);
			});
	};

	function VirtualizedMenuList({ options, children, maxHeight }) {
		// console.log("maxHeight", maxHeight);
		// console.log("children", children);
		// console.log("children data", children[0]?.props?.data);
		// // console.log("children data", children[0].props.data);
		// console.log("options", options);
		const childrenArray = React.Children.toArray(children || []);
		// console.log("children array", childrenArray);

		const rowHeight = useDynamicRowHeight({
			defaultRowHeight: 50,
		});

		if (!childrenArray.length) {
			// console.log("children array is null ");
			return null;
		}

		// console.log("rendering the list ");
		return (
			<List
				style={{ height: 300, width: "100%", color: "black", textAlign: "center" }}
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

	const filteredAllItems = useMemo(() => {
		// console.log("🔍 debouncedSearch:", debouncedSearch);
		// console.log("📦 allItems:", allItems);

		if (!debouncedSearch) {
			// console.log("➡ Returning all items (no search)");
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

			// console.log("🎯 Fuse raw results:", results);

			const mapped = results.map((r) => r.item);
			// const mapped = results.some((r) => r.item);
			// console.log("📌 Mapped results:", mapped);

			return mapped;
		} catch (err) {
			// console.error("❌ Fuzzy error:", err);
			return allItems;
		}
	}, [allItems, debouncedSearch]);

	return (
		<div className="update-container">
			{/* Simple navigation/test links */}
			<form onSubmit={submit} className="update-form">
				{/* Dynamic rows */}
				{requests.map((req, reqIdx) => (
					<div key={reqIdx} className="request-block">
						<h3>
							{" "}
							{t("request")} {reqIdx + 1}
						</h3>
						{/* Inside your Select:*/}

						<div className="update-form-wrapper">
							<div className="form-row-top-container material-request ">
								<div className="form-row-top-right material-request">
									<label htmlFor="">{t("user")}</label>
									<Select
										className="form-row-top-select"
										options={userOptions}
										value={
											// requests[reqIdx]?.requester ? userOptions.find((opt) => opt.value.userId === requests[reqIdx].requester.userId) : null
											requests[reqIdx]?.requester?.userId ? userOptions.find((opt) => opt.value.userId === requests[reqIdx].requester.userId) : null
										}
										onChange={(selected) =>
											handleRequestChange(
												reqIdx,
												"requester",
												selected ? selected.value : null //  full object goes into your state
											)
										}
										filterOption={customUserFilter}
										placeholder={loading ? t("loading") : t("select-requester")}
										isClearable
										isSearchable
										isDisabled={loading || blockInput}
										styles={{
											control: (base) => ({
												...base,
												borderRadius: "12px",
												borderColor: "blue",
												minWidth: "200px",
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

								<div className="form-row-top-left material-request">
									<label htmlFor="">{t("date")}</label>
									{/* Request-level fields */}
									<input
										className="date-input"
										type="date"
										disabled={loading || blockInput}
										// value={req.date || null}
										value={requests[reqIdx]?.addedDate ?? ""}
										onChange={(e) => {
											handleRequestChange(reqIdx, "addedDate", e.target.value), console.log("initial date", e.target.value, "formatted Date", dayjs(e.target.value).toISOString());
										}}
									/>
								</div>
							</div>

							{/* Items inside request */}
							{req.items.map((row, rowIdx) => {
								// const filteredItems = row?.brand?.value ? allItems?.filter((i) => i?.brand === row?.brand?.value) : allItems;
								const filteredItems = row.brand?.value ? filteredAllItems.filter((i) => i.brand === row.brand.value) : filteredAllItems;

								return (
									<div key={rowIdx} className="update-form-row">
										{/* Brand select */}
										<h3 className="form-row-count">
											{t("material-request-row")} {rowIdx + 1}
										</h3>

										<div className="form-row-material-request-item-filter">
											<Select
												options={brands}
												value={row.brand}
												onChange={(val) => handleItemChange(reqIdx, rowIdx, "brand", val)}
												placeholder={iGLoading ? t("loading") : t("select-brand")}
												isClearable
												isSearchable
												isDisabled={iGLoading || blockInput}
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

										<div className="form-row-top-container material-request">
											<div className="form-row-top-left material-request">
												<label htmlFor="">{t("quantity")}</label>
												{/* Quantity */}
												<input type="number" disabled={loading || blockInput} value={row.quantity} onChange={(e) => handleItemChange(reqIdx, rowIdx, "quantity", e.target.value)} placeholder={t("qty")} min={0} />
											</div>

											<div className="form-row-top-right material-request">
												<label htmlFor="">{t("item")}</label>

												<Select
													className="form-row-top-select"
													options={filteredItems}
													// options={allItems}
													value={row.item}
													onChange={(val) => handleItemChange(reqIdx, rowIdx, "item", val)}
													placeholder={isItemsReady ? t("select-item") : t("loading-items")}
													isDisabled={!isItemsReady || blockInput}
													// onInputChange={(val, meta) => {
													// 	// console.log("InputChange value:", val, "action:", meta.action);
													// 	if (meta.action === "input-change") {
													// 		setSearchValue(val);
													// 	}
													// }}
													// onInputChange={(val) => setSearchValue(val)} // update debouncedSearch via useDebounce
													filterOption={() => true}
													isClearable
													isSearchable
													// 													onBlur={() => setSearchValue("")}
													// onMenuClose={() => setSearchValue("")}

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
											{/* come here to update */}

											{row.showOptional && (
												<div className="form-row-center-container-material-request-wrapper">
													{/* <div className="form-row-center-container-material-request-wrapper"> */}
													<div className="form-row-center-container-material-request-wrapper-center">
														<div>
															<label htmlFor="">Color</label>

															{/* Color select */}
															<Select
																className="form-row-top-select"
																options={colorOptions}
																value={colorOptions.find((opt) => opt.value === row.color)}
																onChange={(val) => handleItemChange(reqIdx, rowIdx, "color", val?.value || null)}
																placeholder={t("select-color")}
																isDisabled={loading || blockInput}
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
																formatOptionLabel={(option) => (
																	<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
																		<div style={{ width: "30px", height: "30px", backgroundColor: option.hex, border: "1px solid #ccc" }} />
																		<span>{option.label}</span>
																	</div>
																)}
															/>
														</div>
													</div>

													<div className="form-row-center-container-material-request-wrapper-center">
														<div>
															<label htmlFor="">{t("side")}</label>
															{/* Side select */}
															<Select
																className="form-row-top-select"
																options={sideOptions}
																value={sideOptions.find((opt) => opt.value === row.side)}
																onChange={(val) => handleItemChange(reqIdx, rowIdx, "side", val?.value || null)}
																placeholder={t("select-side")}
																filterOption={customFilter}
																isClearable
																isSearchable
																isDisabled={loading || blockInput}
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
															<label htmlFor="">{t("size")}</label>
															{/* Size select */}
															<Select
																className="form-row-top-select"
																options={sizeOptions}
																value={sizeOptions.find((opt) => opt.value === row.size)}
																onChange={(val) => handleItemChange(reqIdx, rowIdx, "size", val?.value || null)}
																placeholder={t("select-size")}
																filterOption={customFilter}
																isClearable
																isSearchable
																isDisabled={loading || blockInput}
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
													{/* </div> */}
												</div>
											)}

											{row.showDescription && (
												<div className="form-row-center-container-material-request-wrapper-bottom">
													<label htmlFor="">{t("description")}</label>

													{/* Item description */}
													<textarea type="text" disabled={loading || blockInput} value={row.itemDescription} onChange={(e) => handleItemChange(reqIdx, rowIdx, "itemDescription", e.target.value)} placeholder={t("description-for-the-item")} cols={40} rows={10} />
												</div>
											)}

											{/* //REVIEW - change the spans to btns and add the allow to disable them if blockInput == ture or loading  (also change css from spans to btns ) */}
											<div className="form-action-hidden-fields">
												<span className="show-fields-btn" type="button" onClick={() => toggleItemField(reqIdx, rowIdx, "showOptional")}>
													{row.showOptional ? t("hide-optional-fields") : t("show-optional-fields")}
												</span>

												<span className="show-fields-btn" type="button" onClick={() => toggleItemField(reqIdx, rowIdx, "showDescription")}>
													{row.showDescription ? t("hide-description") : t("show-description")}
												</span>
											</div>
										</div>

										{/* Remove item button */}
										{req.items.length > 1 && (
											<div className="form-row-remove-btn-container">
												<span className="remove-row-btn" onClick={() => removeItemRow(reqIdx, rowIdx)}>
													{t("remove")}
												</span>
											</div>
										)}
									</div>
								);
							})}
						</div>

						<div className="form-action-btn">
							<div className="form-row-remove-btn-container">
								{/* Item-level add button */}
								<span className="form-add-row-btn" onClick={() => addItemRow(reqIdx)} disabled={!canAddMore}>
									{t("add-item")}
								</span>
							</div>

							{/* Remove whole request */}
							{requests.length > 1 && (
								<div className="form-row-remove-btn-container">
									<span className="remove-row-btn" type="button" onClick={() => removeRequest(reqIdx)}>
										{t("remove-request")}
									</span>
								</div>
							)}
						</div>
					</div>
				))}

				<div className="form-action-btn">
					{/* Add a whole new request */}
					<span className="form-add-row-btn" onClick={addRequest} disabled={!canAddMore}>
						{t("add-request")}
					</span>

					<div>
						<button className="form-submit-btn" type="submit" onClick={submit} disabled={!canSubmit}>
							{t("request-material")}
						</button>
					</div>
				</div>

				{!canAddMore && (
					<p className="form-error" style={{ color: "red" }}>
						{t("all-required-fields-must-be-filled")}
					</p>
				)}
			</form>
		</div>
	);
}
