import React, { useEffect, useState } from "react";
import DeleteOneUser from "./users/DeleteOneUser";
import { Link, useLocation } from "react-router-dom";

import { jwtDecode } from "jwt-decode";

const Modal = ({ isOpen, onClose, data, userToken }) => {
	const [content, setContent] = useState(null);
	const location = useLocation(); // current URL path
	useEffect(() => {
		if (!data) {
			setContent(null);
			return;
		}
		console.log("modal info", data?.rows);

		// Handle a single user object
		if (data?.__typename === "User" || data?.__typename === "user") {
			const { id, name, email, role, job, permissions, __typename } = data;

			setContent({
				type: __typename,
				value: { id, name, email, role, job, permissions },
			});
		}
	}, [data]);

	//  Safe early return after hooks
	if (!isOpen || !data) return null;

	// Helper function to format keys
	const formatKey = (key) => {
		return key
			.replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters
			.replace(/^./, (str) => str.toUpperCase()); // capitalize first letter
	};

	return (
		<div className="modal-container" onClick={onClose}>
			<div
				className="modal-wrapper"
				onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
			>
				<div className="modal-header">
					{/*when updating a material Request */}
					{location.pathname === `/material/request/${data?.mRequest?.mrId}/update` && (
						<div className="modal-content-header">
							{/* <div className="modal-content-top-info-id">
								<h4>ID:</h4> <p>{content.value.id}</p>
							</div> */}

							<div className="modal-content-top-info-title-wrapper">
								{/* Name */}

								<div>
									<h4>requested by:</h4> <p>{data?.mRequest?.requester?.name}</p>
								</div>
							</div>
						</div>
					)}

					{/* for users */}
					{content?.type === "User" && (
						<div className="modal-content-header">
							{/* <div className="modal-content-top-info-id">
								<h4>ID:</h4> <p>{content.value.id}</p>
							</div> */}

							<div className="modal-content-top-info-title-wrapper">
								{/* Name */}

								<div>
									<h4>Name:</h4> <p>{content.value.name}</p>
								</div>

								{/* Email */}
								<div>
									<h4>Email:</h4> <p>{content.value.email}</p>
								</div>
							</div>
						</div>
					)}

					{/* to close the modal */}
					<button className="modal-close" onClick={onClose}>
						✖
					</button>
				</div>

				<div className="modal-content">
					{location.pathname === `/material/request/${data?.mRequest?.mrId}/update` && (
						<div className="modal-content-info">
							{data.rows.map((row, idx) => {
								return (
									<div className="modal-content-info-wrapper">
										<p>Material Request Row {idx + 1} </p>
										<div className="modal-content-item-info">
											<div className="modal-content-item-info-top">
												<div>
													<label htmlFor=""> quantity </label>
													<p> {row?.quantity}</p>
												</div>{" "}
												<div>
													<label htmlFor=""> Item </label>
													<p>{row?.item?.value}</p>
												</div>
											</div>

											<div className="modal-content-item-info-center">
												<div>
													<label htmlFor=""> color</label>
													<p> {row?.color ? row?.color : "N/A"} </p>
												</div>
												<div>
													<label htmlFor="">side/hand</label>
													<p>{row?.side ? row?.side : "N/A"}</p>
												</div>
												<div>
													<label htmlFor="">size</label>
													<p> {row?.size ? row?.size : "N/A"}</p>
												</div>
											</div>

											<div className="modal-content-item-info-bottom">
												<div>
													<label htmlFor="">Description</label>
													<p> {row?.itemDescription}</p>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* User object */}
					{content?.type === "User" && (
						<>
							<div className="modal-content-info">
								{/* ID */}

								<div className="modal-content-middle-info">
									{/* Job * */}
									{content.value.job && (
										<>
											<h4>Job:</h4>
											<div className="modal-content-middle-info-wrapper">
												<div>
													<h4>Title:</h4> <p>{content.value.job.title}</p>
												</div>
												<div>
													<h4>Description:</h4> <p>{content.value.job.description}</p>
												</div>
											</div>
										</>
									)}
								</div>

								<div className="modal-content-bottom-info">
									{content.value.permissions && (
										<>
											<h4>Permissions:</h4>

											<div className="modal-content-bottom-info-wrapper">
												<div>
													<h4>User Actions:</h4>
													<ul>
														{Object.entries(content.value.permissions)
															.filter(([k, v]) => v === true && k.includes("Users"))
															.map(([k]) => (
																<li key={k}>{formatKey(k) || "N/A"}</li>
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
										</>
									)}
								</div>
								{/* Permissions **/}
							</div>
						</>
					)}
				</div>
				<div className="modal-bottom">
					<div className="model-bottom-wrapper">
						{/* you have to add the links to the update an view  */}
						{location.pathname === "/user/all" ? (
							<div className="model-btn-view">
								<Link to={`/user/${content?.value?.id}`}>
									<span>View</span>
								</Link>
							</div>
						) : null}

						<div className="model-btn-update">
							<Link to={jwtDecode(localStorage.getItem("UserToken")).role === "headAdmin" || jwtDecode(localStorage.getItem("UserToken")).role.role === "admin" ? `/admin/user/${content?.value?.id}/update` : `/user/${content?.value?.id}/update`}>
								<span>Update</span>
							</Link>{" "}
						</div>

						<div className="model-btn-delete">
							<DeleteOneUser userId={content?.value?.id} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Modal;
