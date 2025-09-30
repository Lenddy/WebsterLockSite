import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../assets/WebsterSiteLogo.png";
import Burger from "../assets/burgerMenu.svg?react";
import X from "../assets/x.svg?react";

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
				{ name: "Request Material", path: "/admin/material/request/" },
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
					{location.pathname !== menuItems[0]?.links[0]?.path ? (
						<Link to={menuItems[0]?.links[0]?.path}>
							<img src={Logo} alt="logo" />
						</Link>
					) : (
						<img src={Logo} alt="logo" />
					)}
				</div>

				{/* Desktop nav */}
				{screenWidth > 768 && (
					<>
						<ul className="nav-link-container desktop">
							{menuItems.map((m) => (
								<li className="nav-link-container-dropdown" key={m.title}>
									<span className="nav-link-container-dropdown-title">{m.title} ▾</span>
									<div className="nav-link-container-dropdown-link">
										{m.links.map((i) => (
											<Link key={i.path} to={i.path} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
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
								Log Out
							</Link>
						</div>
					</>
				)}

				{/* Burger icon for mobile */}
				{screenWidth <= 768 && (
					<>
						<Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />
					</>
				)}
			</div>

			{/* Overlay */}
			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

			{/* Mobile menu */}
			{screenWidth <= 768 && (
				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
					<>
						<X className="nav-burger-menu-close-btn" onClick={closeMenu} />
					</>
					{/* </button> */}
					<ul className="nav-burger-menu-links-container">
						{menuItems.map((m) => (
							<li className="nav-burger-menu-links-section" key={m.title}>
								<div className="nav-burger-menu-links-section-title">{m.title}</div>
								{m.links.map((i) => (
									<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
										{i.name}
									</Link>
								))}
							</li>
						))}

						{/* Log out in mobile */}
						<li className="nav-burger-menu-links-section logout">
							<Link
								to="/"
								onClick={() => {
									localStorage.removeItem("UserToken");
									closeMenu();
								}}>
								Log Out
							</Link>
						</li>
					</ul>
				</div>
			)}

			<div className="site-content">{children}</div>
		</div>
	);
}
