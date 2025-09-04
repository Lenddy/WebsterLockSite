import React from "react";

export default function NavBar({ children }) {
	return (
		<div>
			<div className="nav-container">
				<div className="logo nav-logo">
					<img src="" alt="logo" />
				</div>

				<ul>
					<li>item 1</li>
					<li>item 2</li>
					<li>item 3</li>
				</ul>

				<div className="log-out-btn">
					<button>log out</button>
				</div>
			</div>
			{children}
		</div>
	);
}
