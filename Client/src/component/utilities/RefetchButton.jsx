import React, { useState } from "react";
import { useTranslation } from "react-i18next";

function RefetchButton({ refetch, label }) {
	const [status, setStatus] = useState("idle"); // idle | fetching | updated | error
	const { t } = useTranslation();
	label = t("refetch-data");
	t();

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
				return t("fetching-data"); //"⏳ Fetching data..."
			case "updated":
				return t("data-up-to-date"); //"✅ Data up to date";
			case "error":
				return t("failed-to-refresh"); //"⚠️ Failed to refresh";
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
