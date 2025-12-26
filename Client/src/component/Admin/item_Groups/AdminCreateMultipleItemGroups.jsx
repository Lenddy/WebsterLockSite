import { useState, useMemo, useEffect } from "react";
import { useMutation } from "@apollo/client";
import { create_multiple_itemGroups } from "../../../../graphQL/mutations/mutations";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

export default function AdminCreateMultipleItemsGroups() {
	const { userToken, setPageLoading } = useAuth(); // get token from context

	const [message, setMessage] = useState("");
	const [itemGroups, setItemGroups] = useState([
		{
			brand: "",
			itemsList: [
				{
					itemName: "",
				},
			],
		},
	]);

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

	// const { loading, data, error, refetch } = useQuery(get_all_users);
	// const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_item_groups);
	const [createNewItemGroups] = useMutation(create_multiple_itemGroups);

	// Add a new request (with one blank row)
	const addItemGroup = () => {
		setItemGroups([
			...itemGroups,
			{
				brand: "",
				itemsList: [
					{
						itemName: "",
					},
				],
			},
		]);
	};

	// Remove a whole request
	const removeItemGroup = (igIdx) => {
		setItemGroups(itemGroups.filter((_, i) => i !== igIdx));
	};

	const addItemRow = (igIdx) => {
		const updated = [...itemGroups];
		updated[igIdx].itemsList.push({
			itemName: "",
		});
		setItemGroups(updated);
	};

	const removeItemRow = (IgIdx, rowIdx) => {
		const updated = [...itemGroups];
		updated[IgIdx].itemsList = updated[IgIdx].itemsList.filter((_, i) => i !== rowIdx);
		setItemGroups(updated);
	};

	const handleItemGroupChange = (igIdx, field, value) => {
		const updated = [...itemGroups];
		updated[igIdx][field] = value;
		setItemGroups(updated);
	};

	const handleItemChange = (igIdx, rowIdx, field, value) => {
		const updated = [...itemGroups];
		updated[igIdx].itemsList[rowIdx][field] = value;
		setItemGroups(updated);
	};

	const canAddMore = itemGroups.every((ig) => ig.brand && ig.itemsList.every((i) => i.itemName));

	//  Submit validation
	const canSubmit = canAddMore; // since it's the same rule for "everything filled"

	const submit = async (e) => {
		e.preventDefault();
		try {
			const input = itemGroups.flatMap((ig) => ({
				brand: ig.brand,
				itemsList: ig.itemsList.map((i) => ({
					itemName: i?.itemName,
				})),
			}));

			// console.log("this is the input that are send  ", input);

			await createNewItemGroups({
				variables: { input },
				onCompleted: (res) => {
					// console.log("Mutation success:", res.createMultipleItemGroups);
					// newMr =
					// navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
					toast.success(t("Item-groups-added-successfully"));
					setMessage("New Item Groups have been added");
				},
				onError: (err) => {
					// console.warn("Mutation success:", err);
					// newMr =
					// navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
					setMessage("error:", err);
					toast.success(t("Item-groups-added-successfully"));
				},
			});
		} catch (err) {
			console.error("Submit error:", err);
		}
	};

	return (
		<div className="update-container">
			<form onSubmit={submit} className="update-form">
				{itemGroups.map((ig, igIdx) => (
					<div key={igIdx} className="request-block" style={{ marginBottom: "10px" }}>
						<div className="update-form-wrapper">
							{/* Brand Section */}
							<div className="">
								<h3>
									{t("item-group")} {igIdx + 1}
								</h3>
							</div>

							{/* Items Section */}
							<div className="update-form-row">
								<div className="form-row-top-container material-request">
									<div className="form-row-top-right material-request">
										<label>{t("brand-name")}</label>
										<input type="text" value={ig?.brand} onChange={(e) => handleItemGroupChange(igIdx, "brand", e.target.value)} placeholder={t("brand-name")} />
									</div>
								</div>

								<div className="form-row-center item-group">
									<label>{t("items")}</label>

									{ig?.itemsList?.map((row, rowIdx) => (
										<div key={rowIdx} className="form-row-item-wrapper">
											{/* Item Name */}
											<input type="text" value={row?.itemName} onChange={(e) => handleItemChange(igIdx, rowIdx, "itemName", e.target.value)} placeholder={t("item-name")} />

											{/* Remove item */}
											{ig?.itemsList?.length > 1 && (
												<span className="remove-row-btn" onClick={() => removeItemRow(igIdx, rowIdx)}>
													{t("remove")}
												</span>
											)}
										</div>
									))}
								</div>

								{/* Add Item Button */}
								<div className="form-action-btn">
									<div className="form-row-remove-btn-container">
										<span className="form-add-row-btn" onClick={() => addItemRow(igIdx)} disabled={!canAddMore} style={{ margin: "10px 0px" }}>
											{t("add-item")}
										</span>
									</div>

									{/* Remove Item Group Button */}
									{itemGroups.length > 1 && (
										<div className="form-row-remove-btn-container">
											<span className="remove-row-btn" type="button" onClick={() => removeItemGroup(igIdx)} style={{ margin: "10px 0px" }}>
												{t("remove-group")}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				))}

				{/* Add Group & Submit Buttons */}
				<div className="form-action-btn">
					<span className="form-add-row-btn" type="button" onClick={addItemGroup} disabled={!canAddMore}>
						{t("add-group")}
					</span>

					<div>
						<button type="submit" className="form-submit-btn" disabled={!canSubmit}>
							{t("submit")}
						</button>
					</div>
				</div>

				{/* Validation Message */}
				{!canAddMore && <p style={{ color: "red" }}>{t("all-required-fields-must-be-filled")}</p>}
			</form>
		</div>
	);
}
