import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { get_one_material_request, get_all_item_groups } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
// import UpdateOneMaterialRequest from "../Admin/material_request/AdminUpdateOneMaterialRequest";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import AdminUpdateOneMaterialRequest from "../Admin/material_request/AdminUpdateOneMaterialRequest";
import Select from "react-select";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export default function GetOneMaterialRequest() {
	const { userToken, authLoading, setWsDisconnected } = useAuth(); // get token from context
	const { requestId } = useParams();
	const location = useLocation();
	const currentRoutePath = location.pathname;

	const navigate = useNavigate();

	const [rows, setRows] = useState([]);
	const [itemGroups, setItemGroups] = useState([]);
	const [mRequest, setMRequest] = useState({});

	const { t } = useTranslation();

	const { data, loading, error } = useQuery(get_one_material_request, { variables: { id: requestId } });
	// console.log("material data", data);

	const { data: iGData } = useQuery(get_all_item_groups);

	// const canEdit = decodedUser?.permissions?.canEditUsers;

	const decodedUser = useMemo(() => {
		if (!userToken) return null;
		try {
			return JSON.parse(atob(userToken.split(".")[1])); // simple JWT decode
		} catch (err) {
			console.error("Invalid token", err);
			return null;
		}
	}, [userToken]);

	// const canUserReview = useMemo(() => {
	// 	if (!decodedUser || !data?.requester?.userId) return false;

	// 	const role = typeof decodedUser.role === "string" ? decodedUser.role : decodedUser.role?.role;

	// 	const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
	// 	const isOwner = decodedUser.userId === data.requester.userId;

	// 	return hasRole || isOwner;
	// }, [decodedUser, data?.requester?.userId]);

	// useEffect(() => {
	// 	if (!canUserReview) {
	// 		navigate("/material/request/all", { replace: true });
	// 	}
	// }, [canUserReview, navigate]);

	// Options
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

	// Memoize allItems
	const allItems = useMemo(() => {
		return itemGroups?.flatMap((group) =>
			group?.itemsList?.map((item) => ({
				label: `${group.brand} - ${item.itemName}`,
				value: `${group.brand} - ${item.itemName}`,
				brand: group.brand,
			}))
		);
	}, [itemGroups]);

	// Load item groups
	useEffect(() => {
		if (iGData) setItemGroups(iGData.getAllItemGroups || []);
	}, [iGData]);

	// Load material request and map rows
	useEffect(() => {
		if (data && allItems.length > 0) {
			const req = data.getOneMaterialRequest;
			setMRequest({ mrId: req.id, requester: req.requester });

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
						color: matchedColor || { label: item?.color, value: item?.color },
						side: matchedSide || { label: item?.side, value: item?.side },
						size: matchedSize || { label: item?.size, value: item?.size },
					};
				})
			);
		}
	}, [data, allItems]);

	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData, client }) => {
			console.log("📡 Subscription raw data:", subscriptionData);

			const changeEvent = subscriptionData?.data?.onMaterialRequestChange;
			if (!changeEvent) return;

			const { eventType, changeType, change, changes } = changeEvent;

			// Normalize into an array so logic is consistent
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			if (!changesArray.length) return;

			console.log(`📡 Material Request subscription event: ${eventType}, changeType: ${changeType}, count: ${changesArray.length}`);

			// --- Update local state for detailed request view (setRows) ---
			if (requestId) {
				const targetChange = changesArray.find((c) => c.id === requestId);
				if (targetChange) {
					if (eventType === "updated" && Array.isArray(targetChange.items)) {
						//

						setRows(
							targetChange.items.map((item) => {
								const matchedItem = allItems.find((i) => i.value === item.itemName);
								const matchedColor = colorOptions.find((i) => i.value === item.color);
								const matchedSide = sideOptions.find((i) => i.value === item.side);
								const matchedSize = sizeOptions.find((i) => i.value === item.size);

								return {
									id: item.id,
									quantity: item.quantity,
									item: matchedItem || { label: item.itemName, value: item.itemName },
									itemDescription: item.itemDescription ?? "",
									color: matchedColor || null,
									side: matchedSide || null,
									size: matchedSize || null,
								};
							})
						);

						// toast.update(t("the-material-request-has-been-updated"), { autoClose: false });
						toast.info(t("the-material-request-has-been-updated"), {
							autoClose: false,
						});
					}

					if (eventType === "deleted") {
						// TODO - make logic so that the users get redirected when the notification fades or they can click a btn  to stay or be redirected  be redirected if they stay  they cant edit or do anything else  show a notification that says this

						toast.error(t("the-material-request-has-been-deleted-you-will-be-redirected-to-view-all-material-requests"));
						navigate("/material/request/all");
					}
				}
			}
		},

		onError: (err) => {
			console.error("Subscription error:", err);
			if (err?.message?.includes("Socket closed") || err?.networkError) {
				setWsDisconnected(true);
			}
		},
	});

	const canReview = () => {
		const token = decodedUser;
		const role = typeof token?.role === "string" ? token?.role : token?.role?.role;
		return ["headAdmin", "admin", "subAdmin"].includes(role);
	};

	if (authLoading || loading) return <h1>Loading...</h1>;

	return (
		<>
			{currentRoutePath === `/material/request/${requestId}/update` ? (
				// <UpdateOneMaterialRequest client={client} requestId={requestId} />
				<AdminUpdateOneMaterialRequest requestId={requestId} />
			) : (
				<div className="update-container">
					<div className="update-form">
						<div className="update-form-wrapper">
							{rows.map((row, idx) => (
								<div className="update-form-row" key={idx}>
									<h3 className="form-row-count">
										{t("material-request-row")} {idx + 1}
									</h3>

									<div className="form-row-top-container material-request">
										<div className="form-row-top-left material-request">
											<label>{t("quantity")}</label>
											<input type="number" value={row.quantity} min={1} disabled />
										</div>

										<div className="form-row-top-right material-request">
											<label>{t("item")}</label>
											<Select
												className="form-row-top-select"
												value={row.item}
												isDisabled
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
										<div className="form-row-center-container-material-request-wrapper">
											<div className="form-row-center-container-material-request-wrapper-top">
												<label>Color</label>
												<Select
													className="form-row-center-material-request-select"
													classNamePrefix="material-request-color-select"
													value={row.color}
													isDisabled
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

											<div className="form-row-center-container-material-request-wrapper-center">
												<div>
													<label>{t("side")}</label>
													<Select
														value={row.side}
														isDisabled
														className="form-row-top-select"
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
														value={row.size}
														isDisabled
														className="form-row-top-select"
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
											<label>{t("description")}</label>
											<textarea value={row.itemDescription} disabled />
										</div>
									</div>
								</div>
							))}
						</div>

						<div className="form-action-btn">
							{canReview() === true ? (
								<Link to={`/material/request/${requestId}/update`}>
									<button className="form-submit-btn" type="button">
										{t("review")}
									</button>
								</Link>
							) : canReview() === false && data?.getOneMaterialRequest?.approvalStatus?.isApproved === null ? (
								<Link to={`/material/request/${requestId}/update`}>
									<button className="form-submit-btn" type="button">
										{t("update-request")}
									</button>
								</Link>
							) : null}
							{/* !canReview() === true && data?.getOneMaterialRequest?.approvalStatus?.isApproved !== null ? null : null} */}
						</div>
					</div>
				</div>
			)}
			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</>
	);
}
