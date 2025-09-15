import React, { useEffect, useState } from "react";
import DeleteOneUser from "./users/DeleteOneUser";
import { Link } from "react-router-dom";

import { jwtDecode } from "jwt-decode";

const Modal = ({ isOpen, onClose, data, userToke }) => {
	const [content, setContent] = useState(null);

	useEffect(() => {
		if (!data) {
			setContent(null);
			return;
		}

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

					<button className="modal-close" onClick={onClose}>
						✖
					</button>
				</div>

				<div className="modal-content">
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
						<Link to={`/user/${content?.value?.id}`}>
							<span>View</span>
						</Link>{" "}
						<Link to={jwtDecode(localStorage.getItem("UserToken")).role === "headAdmin" || jwtDecode(localStorage.getItem("UserToken")).role.role === "admin" ? `/admin/user/${content?.value?.id}/update` : `/user/${content?.value?.id}/update`}>
							<span>Update</span>
						</Link>{" "}
						<DeleteOneUser userId={content?.value?.id} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Modal;
