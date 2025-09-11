import React from "react";

import DeleteOneUser from "./users/DeleteOneUser";

const Modal = ({ isOpen, onClose, data }) => {
	if (!isOpen || !data) return null;

	// Build a display object including the action
	let displayData = {};

	if (data.__typename === "User") {
		let { id, name, email, role, job, permissions } = data;
		displayData = { id, name, email, role, job, permissions };
	}

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div
				className="modal-box"
				onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
			>
				{/* Close button */}
				<button className="modal-close" onClick={onClose}>
					✖
				</button>

				<h2> {data.__typename} </h2>
				<div className="modal-content">
					{Object.entries(displayData).map(([key, value]) => (
						<li key={key}>
							<strong>{key}:</strong> {typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)}
						</li>
					))}

					<DeleteOneUser userId={displayData.id} />
				</div>
			</div>
		</div>
	);
};

export default Modal;
