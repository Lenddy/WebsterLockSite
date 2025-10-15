import { useEffect, useState } from "react";
import DeleteOneUser from "./users/DeleteOneUser";
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext"; // <-- use context here

const Modal = ({ isOpen, onClose, onConFirm, data, loading }) => {
	const { userToken } = useAuth(); // get currentUser and token from context
	const location = useLocation();
	const [content, setContent] = useState(null);

	// Decode token once if currentUser not available (fallback)
	const logUser = jwtDecode(userToken);

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
									<h4>Requested by:</h4> <p>{data?.mRequest?.requester?.name}</p>
								</div>
							</div>
						</div>
					)}

					{/* Material Request New */}
					{location.pathname === `/material/request/request/` && logUser && (
						<div className="modal-content-header">
							<div className="modal-content-top-info-title-wrapper">
								<div>
									<h4>Requested by:</h4> <p>{logUser.name}</p>
								</div>
							</div>
						</div>
					)}

					{/* Admin Material Item */}
					{location.pathname.includes(`/admin/material/item/`) && (
						<div className="modal-content-header">
							<div className="modal-content-top-info-title-wrapper">
								<div>
									<h4>{data.item.itemName} (will be deleted)</h4>
								</div>
							</div>
						</div>
					)}

					{/* User Object */}
					{content?.type === "User" && (
						<div className="modal-content-header">
							<div className="modal-content-top-info-title-wrapper">
								<div>
									<h4>Name:</h4> <p>{content.value.name}</p>
								</div>
								<div>
									<h4>Email:</h4> <p>{content.value.email}</p>
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
					{(location.pathname === `/material/request/${data?.mRequest?.mrId}/update` || location.pathname === `/material/request/request/`) &&
						data?.rows?.map((row, idx) => (
							<div className="modal-content-info-wrapper" key={idx}>
								<p>Material Request Row {idx + 1}</p>
								<div className="modal-content-item-info">
									<div className="modal-content-item-info-top">
										<div>
											<label>Quantity</label> <p>{row?.quantity}</p>
										</div>
										<div>
											<label>Item</label> <p>{row?.item?.value}</p>
										</div>
									</div>

									<div className="modal-content-item-info-center">
										<div>
											<label>Color</label> <p>{row?.color?.value || "N/A"}</p>
										</div>
										<div>
											<label>Side/Hand</label> <p>{row?.side?.value || "N/A"}</p>
										</div>
										<div>
											<label>Size</label> <p>{row?.size?.value || "N/A"}</p>
										</div>
									</div>

									<div className="modal-content-item-info-bottom">
										<div>
											<label>Description</label> <p>{row?.itemDescription || "N/A"}</p>
										</div>
									</div>
								</div>
							</div>
						))}

					{/* Admin Material Item Info */}
					{location.pathname.includes(`/admin/material/item/`) && (
						<div className="modal-content-info">
							``
							<div className="modal-content-info-wrapper">
								<div className="modal-content-item-info">
									<h4>{data.item.itemName} (will be deleted and must be re-added to use)</h4>
								</div>
							</div>
						</div>
					)}

					{/* User Permissions */}
					{content?.type === "User" && (
						<div className="modal-content-info">
							{content.value.job && (
								<div className="modal-content-middle-info">
									<h4>Job:</h4>
									<div className="modal-content-middle-info-wrapper">
										<div>
											<h4>Title:</h4> <p>{content.value.job.title}</p>
										</div>
										<div>
											<h4>Description:</h4> <p>{content.value.job.description}</p>
										</div>
									</div>
								</div>
							)}

							{content.value.permissions && (
								<div className="modal-content-bottom-info">
									<h4>Permissions:</h4>
									<div className="modal-content-bottom-info-wrapper">
										<div>
											<h4>User Actions:</h4>
											<ul>
												{Object.entries(content.value.permissions)
													.filter(([k, v]) => v === true && k.includes("Users"))
													.map(([k]) => (
														<li key={k}>{formatKey(k)}</li>
													))}
											</ul>
										</div>
										<div>
											<h4>Self Actions:</h4>
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
						{(location.pathname === `/material/request/${data?.mRequest?.mrId}/update` || location.pathname === `/material/request/request/`) && (
							<>
								<div className={`model-btn-view ${loading ? "disabled" : ""}`} onClick={onConFirm}>
									<span>Confirm</span>
								</div>
								<div className={`model-btn-delete ${loading ? "disabled" : ""}`} onClick={onClose}>
									<span>Cancel</span>
								</div>
							</>
						)}

						{/* Admin Material Item */}
						{location.pathname.includes(`/admin/material/item/`) && (
							<>
								<div className={`model-btn-view ${loading ? "disabled" : ""}`} onClick={onConFirm}>
									<span>Confirm</span>
								</div>
								<div className={`model-btn-update ${loading ? "disabled" : ""}`}>
									<Link to={`/admin/material/item/${data.brandId}/update`}>
										<span>Update</span>
									</Link>
								</div>
								<div className={`model-btn-delete ${loading ? "disabled" : ""}`} onClick={onClose}>
									<span>Cancel</span>
								</div>
							</>
						)}

						{/* User Object */}
						{content?.type === "User" && logUser && (
							<>
								{location.pathname === "/user/all" && (
									<div className="model-btn-view">
										<Link to={`/user/${content?.value?.id}`}>
											<span>View</span>
										</Link>
									</div>
								)}
								<div className="model-btn-update">
									<Link to={logUser.role === "headAdmin" || logUser.role?.role === "admin" ? `/admin/user/${content?.value?.id}/update` : `/user/${content?.value?.id}/update`}>
										<span>Update</span>
									</Link>
								</div>
								<div className="model-btn-delete">
									<DeleteOneUser userId={content?.value?.id} />
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
