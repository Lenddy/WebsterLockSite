import { useEffect, useState } from "react";
import DeleteOneUser from "./users/DeleteOneUser";
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import doorHanding from "../assets/doorHanding.jpg";
import { useTranslation } from "react-i18next";

// const Modal = ({ isOpen, onClose, onConFirm, data, loading, setIsOpen }) => {
const Modal = ({ isOpen, onClose, data, setIsOpen, setSelectedUser, onConFirm, loading }) => {
	const { userToken } = useAuth(); // get currentUser and token from context
	const location = useLocation();
	const [content, setContent] = useState(null);

	// Decode token once if currentUser not available (fallback)
	const logUser = jwtDecode(userToken);

	const { t } = useTranslation();
	// console.log("modal open");
	// console.log("log user", logUser);
	// console.log("is open", isOpen, "close", onClose, "data", data);
	// console.log("data", data);

	// Setup content based on data
	useEffect(() => {
		if (!data) {
			setContent(null);
			return;
		}

		if (data?.__typename === "User" || data?.__typename === "user") {
			const { id, name, email, role, job, permissions, __typename } = data;
			setContent({
				type: __typename,
				value: { id, name, email, role, job, permissions },
			});
		}
	}, [data]);

	if (!isOpen || !data) return null;

	const formatKey = (key) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (str) => str.toUpperCase());

	return (
		<div className="modal-container" onClick={onClose}>
			<div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					{/* Material Request Update */}
					{location.pathname === `/material/request/${data?.mRequest?.mrId}/update` && (
						<div className="modal-content-header">
							<div className="modal-content-top-info-title-wrapper">
								<div>
									{data?.deleting ? (
										<h4>{t("material-request-will-be-deleted")}:</h4>
									) : data?.approval === true ? (
										<>
											<h4>{t("requested-by")}:</h4>{" "}
											<p>
												{data?.mRequest?.requester?.name} {t("will-be-approve")}{" "}
											</p>
											{/* <br /> <p>will be approved</p> */}
										</>
									) : data?.updating === true ? (
										<>
											<h4>{t("requested-by")}:</h4>{" "}
											<p>
												{data?.mRequest?.requester?.name} {t("will-be-updated")}{" "}
											</p>
											{/* <br /> <p>will be approved</p> */}
										</>
									) : (
										<>
											<h4>{t("requested-by")}:</h4>{" "}
											<p>
												{data?.mRequest?.requester?.name} {t("will-be-deny")}{" "}
											</p>
											{/* <br /> <p>will be approved</p> */}
										</>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Material Request New */}
					{location.pathname === `/material/request/request` && logUser && (
						<div className="modal-content-header">
							<div className="modal-content-top-info-title-wrapper">
								<div>
									<h4>{t("requested-by")}:</h4> <p>{logUser.name}</p>
								</div>
							</div>
						</div>
					)}

					{/* Admin Material Item */}
					{location.pathname.includes(`/admin/material/item`) && (
						<div className="modal-content-header">
							<div className="modal-content-top-info-title-wrapper">
								<div>
									<h4>
										{data.item.itemName} ({t("will-be-deleted")})
									</h4>
								</div>
							</div>
						</div>
					)}

					{/* User Object */}
					{content?.type === "User" && (
						<div className="modal-content-header">
							<div className="modal-content-top-info-title-wrapper">
								<div>
									<h4>{t("name")}:</h4> <p>{content.value.name}</p>
								</div>
								<div>
									<h4>{t("email")}:</h4> <p>{content.value.email}</p>
								</div>
							</div>
						</div>
					)}

					<button className="modal-close" onClick={onClose}>
						✖
					</button>
				</div>

				<div className="modal-content">
					{/* Material Request Rows */}

					{(location.pathname === `/material/request/request`) & (data.showDoorHanding == true) ? (
						<>
							<img className="door-handing" src={doorHanding} alt="logo" />

							<h1>
								<strong>{t("always-from-the-outside")} </strong>{" "}
							</h1>
						</>
					) : null}

					{(location.pathname === `/material/request/${data?.mRequest?.mrId}/update` || location.pathname === `/material/request/request`) &&
						data?.rows?.map((row, idx) => (
							<div className="modal-content-info-wrapper" key={idx}>
								<p>
									{t("material-request-row")} {idx + 1}
								</p>
								<div className="modal-content-item-info">
									<div className="modal-content-item-info-top">
										<div>
											<label>{t("quantity")}</label> <p>{row?.quantity}</p>
										</div>
										<div>
											<label>{t("item")}</label> <p>{row?.item?.value}</p>
										</div>
									</div>

									<div className="modal-content-item-info-center">
										<div>
											<label>{t("color")}</label> <p>{row?.color?.value || "N/A"}</p>
										</div>
										<div>
											<label>{t("side")}</label> <p>{row?.side?.value || "N/A"}</p>
										</div>
										<div>
											<label>{t("size")}</label> <p>{row?.size?.value || "N/A"}</p>
										</div>
									</div>

									<div className="modal-content-item-info-bottom">
										<div>
											<label>{t("description")}</label> <p>{row?.itemDescription || "N/A"}</p>
										</div>
									</div>
								</div>
							</div>
						))}

					{/* Admin Material Item Info */}
					{location.pathname.includes(`/admin/material/item`) && (
						<div className="modal-content-info">
							``
							<div className="modal-content-info-wrapper">
								<div className="modal-content-item-info">
									<h4>
										{data.item.itemName} ({t("will-be-deleted-and-must-be-re-added-to-use")})
									</h4>
								</div>
							</div>
						</div>
					)}

					{/* User Permissions */}
					{content?.type === "User" && (
						<div className="modal-content-info">
							{content.value.job && (
								<div className="modal-content-middle-info">
									<h4>{t("job")}:</h4>
									<div className="modal-content-middle-info-wrapper">
										<div>
											<h4>{t("title")}:</h4> <p>{content.value.job.title}</p>
										</div>
										<div>
											<h4>{t("description")}:</h4> <p>{content.value.job.description}</p>
										</div>
									</div>
								</div>
							)}

							{content.value.permissions && (
								<div className="modal-content-bottom-info">
									<h4>{t("permissions")}:</h4>
									<div className="modal-content-bottom-info-wrapper">
										<div>
											<h4>{t("user-actions")}:</h4>
											<ul>
												{Object.entries(content.value.permissions)
													.filter(([k, v]) => v === true && k.includes("Users"))
													.map(([k]) => (
														<li key={k}>{formatKey(k)}</li>
													))}
											</ul>
										</div>
										<div>
											<h4>{t("self-actions")}:</h4>
											<ul>
												{Object.entries(content.value.permissions)
													.filter(([k, v]) => v === true && k.includes("Self"))
													.map(([k]) => (
														<li key={k}>{formatKey(k)}</li>
													))}
											</ul>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				<div className="modal-bottom">
					<div className="model-bottom-wrapper">
						{/* Material Request Confirm/Cancel */}
						{(location.pathname === `/material/request/${data?.mRequest?.mrId}/update` || location.pathname === `/material/request/request`) && (
							<>
								<div className={`model-btn-view ${loading ? "disabled" : ""}`} onClick={onConFirm}>
									<span>{t("confirm")}</span>
								</div>
								<div className={`model-btn-delete ${loading ? "disabled" : ""}`} onClick={onClose}>
									<span>{t("cancel")}</span>
								</div>
							</>
						)}

						{/* Admin Material Item */}
						{location.pathname.includes(`/admin/material/item`) && (
							<>
								<div className={`model-btn-view ${loading ? "disabled" : ""}`} onClick={onConFirm}>
									<span>{t("Confirm")}</span>
								</div>
								<div className={`model-btn-update ${loading ? "disabled" : ""}`}>
									<Link to={`/admin/material/item/${data.brandId}/update`}>
										<span>{t("Update")}</span>
									</Link>
								</div>
								<div className={`model-btn-delete ${loading ? "disabled" : ""}`} onClick={onClose}>
									<span>{t("cancel")}</span>
								</div>
							</>
						)}

						{/* User Object */}
						{content?.type === "User" && logUser && (
							<>
								{location.pathname === "/user/all" && (
									<div className="model-btn-view">
										<Link to={`/user/${content?.value?.id}`}>
											<span>{t("view")}</span>
										</Link>
									</div>
								)}
								<div className="model-btn-update">
									<Link to={logUser.role === "headAdmin" || logUser.role?.role === "admin" ? `/admin/user/${content?.value?.id}/update` : `/user/${content?.value?.id}/update`}>
										<span>{t("update")}</span>
									</Link>
								</div>
								<div className="model-btn-delete">
									<DeleteOneUser userId={content?.value?.id} setIsOpen={setIsOpen} setSelectedUser={setSelectedUser} />
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Modal;
