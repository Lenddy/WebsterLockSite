import "../../../newFeature.css";
import { VirtuosoGrid } from "react-virtuoso";
import { forwardRef } from "react";
import { redirect } from "react-router-dom";

function Items() {
	const data = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);

	const gridComponents = {
		List: forwardRef(({ style, children, ...props }, ref) => (
			<div
				// classname === virtuoso-grid-list
				ref={ref}
				{...props}
				style={{
					// backgroundColor: "red",
					...style,
				}}>
				{children}
			</div>
		)),

		Item: ({ children, ...props }) => (
			<div
				// classname virtuoso-grid-item

				{...props}>
				{children}
			</div>
		),
	};

	const ItemWrapper = ({ children }) => <div className="virtuoso-grid-item-content">{children}</div>;

	return (
		<div className="virtuoso-item-container">
			<VirtuosoGrid data={data} components={gridComponents} itemContent={(index, item) => <ItemWrapper>{item}</ItemWrapper>} />
		</div>
	);
}

export default Items;
