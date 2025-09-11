import React, { useEffect, useState } from "react";
import DeleteOneUser from "./users/DeleteOneUser";

const Modal = ({ isOpen, onClose, data }) => {
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
				<button className="modal-close" onClick={onClose}>
					✖
				</button>

				<div className="modal-content">
					{/* User object */}
					{content?.type === "User" && (
						<div className="">
							<div className="modal-content-info">
								{/* ID */}

								<div className="modal-top-info">
									<div>
										<strong>ID:</strong> {content.value.id}
									</div>

									<div>
										{/* Name */}
										<div>
											<strong>Name:</strong> {content.value.name}
										</div>

										{/* Email */}
										<div>
											<strong>Email:</strong> {content.value.email}
										</div>
									</div>
								</div>

								{/* Job * 
								{content.value.job && (
									<div>
										<strong>Job:</strong>
										<div>
											<strong>Title:</strong> {content.value.job.title}
										</div>
										<div>
											<strong>Description:</strong> {content.value.job.description}
										</div>
									</div>
								)}
                                    */}

								{/* Permissions *
								{content.value.permissions && (
									<div>
										<strong>Permissions:</strong>
										<div>
											<strong>User Actions:</strong>
											<ul>
												{Object.entries(content.value.permissions)
													.filter(([k, v]) => v === true && k.includes("Users"))
													.map(([k]) => (
														<li key={k}>{formatKey(k)}</li>
													))}
											</ul>
										</div>
										<div>
											<strong>Self Actions:</strong>
											<ul>
												{Object.entries(content.value.permissions)
													.filter(([k, v]) => v === true && k.includes("Self"))
													.map(([k]) => (
														<li key={k}>{formatKey(k)}</li>
													))}
											</ul>
										</div>
									</div>
								)}  */}
							</div>

							<DeleteOneUser userId={content.value.id} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Modal;
