import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import Select from "react-select";
import Fuse from "fuse.js";
import { get_all_item_groups, get_one_item_group } from "../../../../graphQL/queries/queries";
import { update_multiple_itemGroups } from "../../../../graphQL/mutations/mutations";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useItemGroups } from "../../../context/ItemGroupContext";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

export default function AdminUpdateMultipleItemsGroups() {
	const { userToken, setPageLoading } = useAuth(); // get token from context
	const [oldItemGroups, setOldItemGroups] = useState([]);

	const [selectedGroups, setSelectedGroups] = useState([]);
	const [changesMade, setChangesMade] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [formReset, setFormReset] = useState(false);
	const [toastOpen, setToastOpen] = useState(false);
	const [blockInput, setBlockInput] = useState(false);

	const { itemId } = useParams();

	//  Two queries: one for all, one for single
	// const {
	// 	loading: loadingAll,
	// 	data: allData,
	// 	error: errorAll,
	// } = useQuery(get_all_item_groups, {
	// 	skip: !!itemId, // skip if we're fetching one
	// });

	const { items: allData, loading: loadingAll, error: errorAll } = useItemGroups();

	const { t } = useTranslation();
	const navigate = useNavigate();

	const {
		loading: loadingOne,
		data: oneData,
		error: errorOne,
	} = useQuery(get_one_item_group, {
		variables: { id: itemId },
		skip: !itemId, // only run if we have param
	});

	const [updateItemGroups] = useMutation(update_multiple_itemGroups);

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

	//  Handle when all item groups are fetched (no param mode)
	useEffect(() => {
		if (!itemId && allData) {
			setOldItemGroups(allData);
			if (selectedGroups.length === 0) {
				setSelectedGroups([{ id: null, brand: "", itemsList: [], brandAction: {} }]);
			}
		}
	}, [allData, itemId, selectedGroups.length]);

	//  Handle when single item group is fetched (param mode)
	useEffect(() => {
		if (itemId && oneData?.getOneItemGroup) {
			const group = oneData.getOneItemGroup;
			setSelectedGroups([
				{
					...group,
					itemsList: group.itemsList.map((i) => ({ ...i, action: {} })),
					brandAction: {},
				},
			]);
			setOldItemGroups([group]); // so dropdown still works
		}
	}, [oneData, itemId]);

	const options = oldItemGroups.map((g) => ({
		value: g.id,
		label: g.brand,
	}));

	// Custom fuzzy search filter
	const customUserFilter = (option, inputValue) => {
		if (!inputValue) return true;
		const fuse = new Fuse(options, { keys: ["label"], threshold: 0.4 });
		return fuse.search(inputValue).some((r) => r.item.value === option.value);
	};

	const handleSelectGroup = (groupIdx, selected) => {
		if (!selected) return;
		const alreadyAdded = selectedGroups.some((g, idx) => g.id === selected.value && idx !== groupIdx);
		if (alreadyAdded) return;

		const group = oldItemGroups.find((g) => g.id === selected.value);
		const newGroup = {
			...group,
			itemsList: group.itemsList.map((i) => ({ ...i, action: {} })),
			brandAction: {},
		};

		const updated = [...selectedGroups];
		updated[groupIdx] = newGroup;
		setSelectedGroups(updated);
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
		const item = updated[groupIdx].itemsList[itemIdx];

		updated[groupIdx].itemsList[itemIdx] = {
			...item,
			itemName: value,
			action: item.id ? { toBeUpdated: true } : { toBeAdded: true },
		};

		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const addItem = (groupIdx) => {
		const updated = [...selectedGroups];
		updated[groupIdx].itemsList.push({
			id: null,
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
			updated[groupIdx].itemsList[itemIdx] = { ...item, action: { toBeDeleted: true } };
		} else {
			updated[groupIdx].itemsList.splice(itemIdx, 1);
		}

		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const undoDeleteItem = (groupIdx, itemIdx) => {
		const updated = [...selectedGroups];
		updated[groupIdx].itemsList[itemIdx] = {
			...updated[groupIdx].itemsList[itemIdx],
			action: {},
		};
		setSelectedGroups(updated);
		setChangesMade(true);
	};

	const addGroupEditor = () => {
		setSelectedGroups((prev) => [...prev, { id: null, brand: "", itemsList: [], brandAction: {} }]);
	};

	const removeGroupEditor = (groupIdx) => {
		setSelectedGroups((prev) => prev.filter((_, idx) => idx !== groupIdx));
	};

	// const submit = async (e) => {
	// 	e.preventDefault();

	// 	if (!changesMade) {
	// 		toast.success(t("no-changes-made"));
	// 		return;
	// 	}

	// 	const input = selectedGroups
	// 		.filter((g) => g.id)
	// 		.map((g) => {
	// 			const groupPayload = { id: g.id };
	// 			if (g.brandAction?.toBeUpdated) {
	// 				groupPayload.brand = g.brand;
	// 				groupPayload.brandNameUpdate = true;
	// 			}

	// 			const changedItems = g.itemsList
	// 				.filter((item) => item.action?.toBeAdded || item.action?.toBeUpdated || item.action?.toBeDeleted)
	// 				.map((item) => {
	// 					const payload = { action: {} };
	// 					if (item.id) payload.id = item.id;
	// 					if (item.itemName && (item.action?.toBeAdded || item.action?.toBeUpdated)) {
	// 						payload.itemName = item.itemName;
	// 					}
	// 					if (item.action?.toBeAdded) payload.action.toBeAdded = true;
	// 					if (item.action?.toBeUpdated) payload.action.toBeUpdated = true;
	// 					if (item.action?.toBeDeleted) payload.action.toBeDeleted = true;
	// 					return payload;
	// 				});

	// 			if (changedItems.length > 0) groupPayload.itemsList = changedItems;
	// 			return groupPayload;
	// 		})
	// 		.filter((g) => g.brand || g.brandNameUpdate || g.itemsList);

	// 	if (input.length === 0) {
	// 		alert(t("no-real-changes-to-submit"));
	// 		return;
	// 	}

	// 	console.log("Submitting:", input);

	// 	await updateItemGroups({
	// 		variables: { input },
	// 		onCompleted: (res) => {
	// 			alert(t("item-groups-have-been-updated-successfully"));
	// 			// ("Item Groups have been Updated successfully!");
	// 			//  console.log("Success:", res)
	// 		},
	// 		onError: (err) => console.error("Error:", err),
	// 	});
	// };
	//

	// todo if theres an id send as a param set the ide to be the selected group
	const resetForm = () => {
		setSelectedGroups([{ id: null, brand: "", itemsList: [], brandAction: {} }]);

		setHasSubmitted(false);
		setFormReset(true);
	};

	const SuccessToast = ({ closeToast, resetForm }) => (
		<div>
			<p>{t("items-have-been-updated-successfully")}</p>

			<div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
				<button
					onClick={() => {
						closeToast();
						setBlockInput(false);
						navigate("/admin/material/item/all");
					}}>
					{t("view-all-items")}
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
					{t("update-more-items")}
				</button>
			</div>

			{/* <p style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>{t("duplicate-request")}</p> */}
		</div>
	);

	const submit = async (e) => {
		e.preventDefault();

		if (!changesMade) {
			toast.info(t("no-changes-made"));
			return;
		}

		if (hasSubmitted === true) {
			toast.warn(t("duplicate-request-warning"), {
				// autoClose: false,
			});
			return;
		}

		const input = selectedGroups
			.filter((g) => g.id)
			.map((g) => {
				const groupPayload = { id: g.id };

				if (g.brandAction?.toBeUpdated) {
					groupPayload.brand = g.brand;
					groupPayload.brandNameUpdate = true;
				}

				const changedItems = g.itemsList
					.filter((item) => item.action?.toBeAdded || item.action?.toBeUpdated || item.action?.toBeDeleted)
					.map((item) => {
						const payload = { action: {} };

						if (item.id) payload.id = item.id;
						if (item.itemName && (item.action?.toBeAdded || item.action?.toBeUpdated)) {
							payload.itemName = item.itemName;
						}

						if (item.action?.toBeAdded) payload.action.toBeAdded = true;
						if (item.action?.toBeUpdated) payload.action.toBeUpdated = true;
						if (item.action?.toBeDeleted) payload.action.toBeDeleted = true;

						return payload;
					});

				if (changedItems.length > 0) groupPayload.itemsList = changedItems;
				return groupPayload;
			})
			.filter((g) => g.brand || g.brandNameUpdate || g.itemsList);

		if (input.length === 0) {
			toast.warn(t("no-real-changes-to-submit"));
			return;
		}

		// console.log("Submitting:", input);

		const mutationPromise = updateItemGroups({
			variables: { input },
		});

		toast.promise(mutationPromise, {
			pending: t("updating-items"),

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
			.then(() => {
				setHasSubmitted(true);
				setBlockInput(true);
			})
			.catch(() => {
				setHasSubmitted(false);
			});
	};

	const isLoading = loadingAll || loadingOne;
	const hasError = errorAll || errorOne;

	if (isLoading) return <p>{t("loading")}</p>;
	if (hasError) return <p>{t("error-loading-data")}</p>;

	return (
		<div className="update-container">
			{/* add a form later  */}
			<form onSubmit={submit} className="update-form">
				{selectedGroups.map((group, gIdx) => (
					<div key={gIdx} className="request-block" style={{ marginBottom: "10px" }}>
						<div className="update-form-wrapper">
							<div>
								<Select
									options={options.filter((opt) => !selectedGroups.some((g, idx) => g.id === opt.value && idx !== gIdx))}
									value={group.id ? options.find((opt) => opt.value === group.id) : null}
									placeholder={!!itemId || loadingAll || loadingOne ? t("loading") : t("select-item-group-to-edit")}
									filterOption={customUserFilter}
									isSearchable
									onChange={(selected) => handleSelectGroup(gIdx, selected)}
									isDisabled={!!itemId || loadingAll || loadingOne || blockInput} //  disable dropdown if loaded from param
									styles={{
										control: (base, state) => ({
											...base,
											borderRadius: "12px",
											borderColor: "blue",
											width: "250px",
											height: "50px",
											opacity: state.isDisabled ? 0.6 : 1,
											cursor: state.isDisabled ? "not-allowed" : "default",
											scale: 1,
										}),
										option: (base, state) => ({
											...base,
											backgroundColor: state.isFocused ? "lightblue" : "white",
											color: "black",
										}),
									}}
								/>
							</div>

							<div className="update-form-row">
								<div className="form-row-top-container material-request">
									{group.id && (
										<div className="form-row-top-right material-request">
											<label>{t("brand")}:</label>
											<input type="text" value={group.brand} onChange={(e) => handleBrandChange(gIdx, e.target.value)} placeholder={t("brand-name")} disabled={blockInput} />
										</div>
									)}
								</div>
								{/* <h4>Items</h4> */}
								<div className="form-row-center item-group">
									{group.id && (
										<>
											<label>{t("items")}</label>

											{group.itemsList.map((item, idx) => (
												<div key={idx} className="form-row-item-wrapper ">
													{/* form-row-top-right material-request  update-form-input  */}
													{item.action?.toBeDeleted ? (
														<>
															<span style={{ color: "red" }}>
																{item.itemName} ({t("marked-for-deletion")})
															</span>
															<span className="remove-row-btn" onClick={() => undoDeleteItem(gIdx, idx)}>
																{t("undo")}
															</span>
														</>
													) : (
														<>
															{/* <div> */}
															<input type="text" value={item.itemName} onChange={(e) => handleItemChange(gIdx, idx, e.target.value)} placeholder={t("items-name")} />
															{/* </div> */}

															{/* <div> */}
															<span className="remove-row-btn" onClick={() => deleteItem(gIdx, idx)}>
																{t("delete")}
															</span>
															{/* </div> */}
														</>
													)}
												</div>
											))}
											<div className="form-action-btn">
												<div className="form-row-remove-btn-container">
													<span className="form-add-row-btn" style={{ margin: "10px 0px" }} onClick={() => addItem(gIdx)}>
														{t("add-item")}
													</span>
												</div>

												{selectedGroups.length > 1 && !itemId && (
													<div className="form-row-remove-btn-container">
														<span className="remove-row-btn" style={{ margin: "10px 0px" }} onClick={() => removeGroupEditor(gIdx)}>
															{t("remove-group")}
														</span>
													</div>
												)}
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				))}

				<div className="form-action-btn">
					{/* Only allow adding new groups if not editing single group */}
					{!itemId && (
						<span className="form-add-row-btn" type="button" onClick={addGroupEditor}>
							{t("add-group")}
						</span>
					)}

					<div>
						<button type="submit" className="form-submit-btn" disabled={!changesMade}>
							{t("update")}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
