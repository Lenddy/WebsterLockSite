// components/VirtualizedMenuList.jsx
import { Virtuoso } from "react-virtuoso";
import { useTranslation } from "react-i18next";

export default function VirtualizedMenuList({ children, maxHeight = 300 }) {
	const { t } = useTranslation();

	const items = Array.isArray(children) ? children : [];

	if (!items.length) {
		return <div style={{ padding: 10, textAlign: "center" }}>{t("no-results-found")}</div>;
	}

	return (
		<div style={{ height: maxHeight }}>
			<Virtuoso style={{ height: maxHeight, borderBottom: "solid " }} totalCount={items.length} itemContent={(index) => <div>{items[index]}</div>} />
		</div>
	);
}
