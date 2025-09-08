import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../assets/WebsterSiteLogo.png";

export default function NavBar({ children, screenWidth }) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const closeMenu = () => setMobileOpen(false);
	const location = useLocation(); // current URL path

	const menuItems = [
		{
			title: "Users",
			links: [
				{ name: "View All", path: "/user/all" },
				{ name: "Register Users", path: "/admin/user/register" },
				{ name: "Update Users", path: "/admin/user/update" },
			],
		},
		{
			title: "Material Requests",
			links: [
				{ name: "View All", path: "/material/request/all" },
				{ name: "Requests Material", path: "/admin/material/request/" },
			],
		},
		{
			title: "Items",
			links: [
				{ name: "View All", path: "/admin/material/item/all" },
				{ name: "Add Items", path: "/admin/material/item/create" },
				{ name: "Update Items", path: "/admin/material/item/update" },
			],
		},
	];

	return (
		<div className="content-container">
			<div className="nav-container">
				{/* Logo on left */}
				<div className="nav-logo">
					<img src={Logo} alt="logo" />
				</div>

				{/* Desktop nav */}
				{screenWidth > 768 && (
					<>
						<ul className="nav-link-container desktop-only">
							{menuItems.map((m) => (
								<li className="dropdown" key={m.title}>
									<span className="dropbtn">{m.title} ▾</span>
									<div className="dropdown-content">
										{m.links.map((i) => (
											<Link key={i.path} to={i.path} className={location.pathname === i.path ? "disabled" : ""}>
												{i.name}
											</Link>
										))}
									</div>
								</li>
							))}
						</ul>

						{/* Log out on far right */}
						<div className="desktop-logout">
							<Link to="/" onClick={() => localStorage.removeItem("UserToken")}>
								Log out
							</Link>
						</div>
					</>
				)}

				{/* Burger icon for mobile */}
				{screenWidth <= 768 && (
					<div className="nav-burger-menu" onClick={() => setMobileOpen(true)}>
						☰
					</div>
				)}
			</div>

			{/* Overlay */}
			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

			{/* Mobile menu */}
			{screenWidth <= 768 && (
				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
					<button className="nav-burger-menu-close-btn" onClick={closeMenu}>
						✕
					</button>
					<ul className="nav-burger-menu-links-container">
						{menuItems.map((m) => (
							<li className="nav-burger-menu-links-section" key={m.title}>
								<div className="nav-burger-menu-links-section-title">{m.title}</div>
								{m.links.map((i) => (
									<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "disabled" : ""}>
										{i.name}
									</Link>
								))}
							</li>
						))}

						{/* Log out in mobile */}
						<li className="mobile-section logout">
							<Link
								to="/"
								onClick={() => {
									localStorage.removeItem("UserToken");
									closeMenu();
								}}>
								Log out
							</Link>
						</li>
					</ul>
				</div>
			)}

			<div className="content">{children}</div>
		</div>
	);
}

// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import Logo from "../assets/WebsterSiteLogo.png";

// export default function NavBar({ children, screenWidth }) {
// 	const [mobileOpen, setMobileOpen] = useState(false);
// 	const closeMenu = () => setMobileOpen(false);

// 	const location = useLocation(); // Current URL path

// 	const menuItems = [
// 		{
// 			title: "Users",
// 			links: [
// 				{ name: "View All", path: "/user/all" },
// 				{ name: "Register Users", path: "/admin/user/register" },
// 				{ name: "Update Users", path: "/admin/user/update" },
// 			],
// 		},
// 		{
// 			title: "Material Requests",
// 			links: [
// 				{ name: "View All", path: "/material/request/all" },
// 				{ name: "Requests Material", path: "/admin/material/request/" },
// 			],
// 		},
// 		{
// 			title: "Items",
// 			links: [
// 				{ name: "View All", path: "/admin/material/item/all" },
// 				{ name: "Add Items", path: "/admin/material/item/create" },
// 				{ name: "Update Items", path: "/admin/material/item/update" },
// 			],
// 		},
// 	];

// 	return (
// 		<div className="content-container">
// 			<div className="nav-container">
// 				{/* Logo */}
// 				<div className="nav-logo">
// 					<img src={Logo} alt="logo" />
// 				</div>

// 				{/* Desktop nav */}
// 				{screenWidth > 768 && (
// 					<ul className="nav-link-container desktop-only">
// 						{menuItems?.map((m) => (
// 							<li className="dropdown" key={m.title}>
// 								<span className="dropbtn">{m.title} ▾</span>
// 								<div className="dropdown-content">
// 									{m?.links.map((i) => (
// 										<Link key={i.path} to={i.path} className={location.pathname === i.path ? "disabled" : ""}>
// 											{i.name}
// 										</Link>
// 									))}
// 								</div>
// 							</li>
// 						))}

// 						{/* Log out in desktop */}
// 						<li className="logout">
// 							<Link to="/" onClick={() => localStorage.removeItem("UserToken")}>
// 								Log out
// 							</Link>
// 						</li>
// 					</ul>
// 				)}

// 				{/* Burger icon for mobile */}
// 				{screenWidth <= 768 && (
// 					<div className="burger" onClick={() => setMobileOpen(true)}>
// 						☰
// 					</div>
// 				)}
// 			</div>

// 			{/* Overlay */}
// 			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

// 			{/* Mobile menu */}
// 			{screenWidth <= 768 && (
// 				<div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
// 					<button className="close-btn" onClick={closeMenu}>
// 						✕
// 					</button>
// 					<ul className="mobile-links">
// 						{menuItems?.map((m) => (
// 							<li className="mobile-section" key={m.title}>
// 								<div className="mobile-title">{m.title}</div>
// 								{m?.links.map((i) => (
// 									<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "disabled" : ""}>
// 										{i.name}
// 									</Link>
// 								))}
// 							</li>
// 						))}

// 						{/* Log out in mobile */}
// 						<li className="mobile-section logout">
// 							<Link
// 								to="/"
// 								onClick={() => {
// 									localStorage.removeItem("UserToken");
// 									closeMenu();
// 								}}>
// 								Log out
// 							</Link>
// 						</li>
// 					</ul>
// 				</div>
// 			)}

// 			<div className="content">{children}</div>
// 		</div>
// 	);
// }
