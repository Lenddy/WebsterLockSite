import React, { useState } from "react";

function RefetchButton({ refetch, label = "🔄 Refetch Data" }) {
	const [status, setStatus] = useState("idle"); // idle | fetching | updated | error

	const handleRefetch = async () => {
		if (typeof refetch !== "function") {
			console.warn("No valid refetch function provided.");
			setStatus("error");
			setTimeout(() => setStatus("idle"), 2000);
			return;
		}

		try {
			setStatus("fetching");
			const { data } = await refetch();
			if (data) {
				setStatus("updated");
				setTimeout(() => setStatus("idle"), 2000);
			}
		} catch (err) {
			console.error("Refetch failed:", err);
			setStatus("error");
			setTimeout(() => setStatus("idle"), 2000);
		}
	};

	const renderLabel = () => {
		switch (status) {
			case "fetching":
				return "⏳ Fetching data...";
			case "updated":
				return "✅ Data up to date";
			case "error":
				return "⚠️ Failed to refresh";
			default:
				return label;
		}
	};

	return (
		<div className="refetch-btn-container">
			<button
				className="refetch-btn"
				onClick={handleRefetch}
				disabled={status === "fetching"}
				style={{
					backgroundColor: status === "error" ? "#3f1717" : status === "updated" ? "#06402b" : status === "fetching" ? "#b5a642" : "#36404a",

					cursor: status === "fetching" ? "wait" : "pointer",
					transition: "all 0.3s ease",
				}}>
				{renderLabel()}
			</button>
		</div>
	);
}

export default RefetchButton;
