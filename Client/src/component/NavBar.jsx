import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/WebsterSiteLogo.png";
import Burger from "../assets/burgerMenu.svg?react";
import X from "../assets/x.svg?react";

export default function NavBar({ children, screenWidth }) {
	const { userToken, setUserToken, loading: authLoading } = useAuth();
	const [decodedUser, setDecodedUser] = useState(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const location = useLocation();

	// Decode token once it becomes available
	useEffect(() => {
		if (userToken) {
			try {
				const decoded = jwtDecode(userToken);
				setDecodedUser(decoded);
			} catch (err) {
				console.error("Failed to decode token:", err);
				setDecodedUser(null);
			}
		} else {
			setDecodedUser(null);
		}
	}, [userToken]);

	const closeMenu = () => setMobileOpen(false);

	const handleLogout = () => {
		setUserToken(null); // clears context + localStorage
		window.location.reload();
	};

	// Wait until context is loaded
	if (authLoading) return null;

	// If no token, render nothing (ProtectedRoutes will redirect)
	if (!decodedUser) return null;

	const role = decodedUser?.role;
	const isAdmin = ["headAdmin", "admin", "subAdmin"].includes(role);

	const menuItems = isAdmin
		? [
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
						{ name: "Items Usage", path: "/admin/material/item/usage" },
					],
				},
		  ]
		: [
				{
					title: "Material Requests",
					links: [
						{ name: "View All", path: "/material/request/all" },
						{ name: "Request Material", path: "/material/request/request/" },
					],
				},
		  ];

	return (
		<div className="content-container">
			<div className="nav-container">
				<div className="nav-logo">
					<Link to={menuItems[0]?.links[0]?.path}>
						<img src={Logo} alt="logo" />
					</Link>
				</div>

				{/* Desktop menu */}
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

						<div className="desktop-logout">
							<Link to="/" onClick={handleLogout}>
								Log Out
							</Link>
						</div>
					</>
				)}

				{/* Mobile burger menu */}
				{screenWidth <= 768 && <Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />}
			</div>

			{/* Overlay */}
			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

			{/* Mobile menu */}
			{screenWidth <= 768 && (
				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
					<X className="nav-burger-menu-close-btn" onClick={closeMenu} />
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

						<li className="nav-burger-menu-links-section logout">
							<Link to="/" onClick={handleLogout}>
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

// import React, { useState, useEffect } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { jwtDecode } from "jwt-decode";
// import { useAuth } from "../context/AuthContext"; //  added
// import Logo from "../assets/WebsterSiteLogo.png";
// import Burger from "../assets/burgerMenu.svg?react";
// import X from "../assets/x.svg?react";

// export default function NavBar({ children, screenWidth }) {
// 	const { userToken, setUserToken } = useAuth(); //  use context instead of prop
// 	const [decodedUser, setDecodedUser] = useState(null);
// 	const [mobileOpen, setMobileOpen] = useState(false);
// 	const location = useLocation();

// 	const closeMenu = () => setMobileOpen(false);

// 	useEffect(() => {
// 		//  Decode token from context
// 		if (userToken && typeof userToken === "string") {
// 			try {
// 				const decoded = jwtDecode(userToken);
// 				setDecodedUser(decoded);
// 			} catch (err) {
// 				console.error("Failed to decode token:", err);
// 				setDecodedUser(null);
// 			}
// 		} else {
// 			setDecodedUser(null);
// 		}
// 	}, [userToken]);

// 	//  Graceful handling while waiting for context to load
// 	if (!decodedUser) {
// 		return (
// 			<div className="loading-container">
// 				<p>Loading navigation...</p>
// 			</div>
// 		);
// 	}

// 	const role = decodedUser?.role;
// 	const isAdmin = ["headAdmin", "admin", "subAdmin"].includes(role);

// 	const menuItems = isAdmin
// 		? [
// 				{
// 					title: "Users",
// 					links: [
// 						{ name: "View All", path: "/user/all" },
// 						{ name: "Register Users", path: "/admin/user/register" },
// 						{ name: "Update Users", path: "/admin/user/update" },
// 					],
// 				},
// 				{
// 					title: "Material Requests",
// 					links: [
// 						{ name: "View All", path: "/material/request/all" },
// 						{ name: "Request Material", path: "/admin/material/request/" },
// 					],
// 				},
// 				{
// 					title: "Items",
// 					links: [
// 						{ name: "View All", path: "/admin/material/item/all" },
// 						{ name: "Add Items", path: "/admin/material/item/create" },
// 						{ name: "Update Items", path: "/admin/material/item/update" },
// 						{ name: "Items Usage", path: "/admin/material/item/usage" },
// 					],
// 				},
// 		  ]
// 		: [
// 				{
// 					title: "Material Requests",
// 					links: [
// 						{ name: "View All", path: "/material/request/all" },
// 						{ name: "Request Material", path: "/material/request/request/" },
// 					],
// 				},
// 		  ];

// 	const handleLogout = () => {
// 		setUserToken(null); //  clear context + localStorage (handled inside context)
// 		window.location.reload(); //  ensure fresh state
// 	};

// 	return (
// 		<div className="content-container">
// 			<div className="nav-container">
// 				{/* Logo */}
// 				<div className="nav-logo">
// 					{location.pathname !== menuItems[0]?.links[0]?.path ? (
// 						<Link to={menuItems[0]?.links[0]?.path}>
// 							<img src={Logo} alt="logo" />
// 						</Link>
// 					) : (
// 						<img src={Logo} alt="logo" />
// 					)}
// 				</div>

// 				{/* Desktop Nav */}
// 				{screenWidth > 768 && (
// 					<>
// 						<ul className="nav-link-container desktop">
// 							{menuItems.map((m) => (
// 								<li className="nav-link-container-dropdown" key={m.title}>
// 									<span className="nav-link-container-dropdown-title">{m.title} ▾</span>
// 									<div className="nav-link-container-dropdown-link">
// 										{m.links.map((i) => (
// 											<Link key={i.path} to={i.path} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 												{i.name}
// 											</Link>
// 										))}
// 									</div>
// 								</li>
// 							))}
// 						</ul>

// 						{/* Logout */}
// 						<div className="desktop-logout">
// 							<Link to="/" onClick={handleLogout}>
// 								Log Out
// 							</Link>
// 						</div>
// 					</>
// 				)}

// 				{/* Mobile Burger Menu */}
// 				{screenWidth <= 768 && <Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />}
// 			</div>

// 			{/* Overlay */}
// 			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

// 			{/* Mobile Menu */}
// 			{screenWidth <= 768 && (
// 				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
// 					<X className="nav-burger-menu-close-btn" onClick={closeMenu} />
// 					<ul className="nav-burger-menu-links-container">
// 						{menuItems.map((m) => (
// 							<li className="nav-burger-menu-links-section" key={m.title}>
// 								<div className="nav-burger-menu-links-section-title">{m.title}</div>
// 								{m.links.map((i) => (
// 									<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 										{i.name}
// 									</Link>
// 								))}
// 							</li>
// 						))}

// 						{/* Mobile Logout */}
// 						<li className="nav-burger-menu-links-section logout">
// 							<Link to="/" onClick={handleLogout}>
// 								Log Out
// 							</Link>
// 						</li>
// 					</ul>
// 				</div>
// 			)}

// 			<div className="site-content">{children}</div>
// 		</div>
// 	);
// }

// import React, { useState, useEffect } from "react";
// import { Link, useLocation } from "react-router-dom";
// import Logo from "../assets/WebsterSiteLogo.png";
// import Burger from "../assets/burgerMenu.svg?react";
// import X from "../assets/x.svg?react";
// import { jwtDecode } from "jwt-decode";

// export default function NavBar({ children, screenWidth, userToken }) {
// 	const [mobileOpen, setMobileOpen] = useState(false);
// 	const [decodedUser, setDecodedUser] = useState(null); //  store decoded token safely
// 	const location = useLocation();

// 	const closeMenu = () => setMobileOpen(false);

// 	useEffect(() => {
// 		//  Try reading token from props OR localStorage (backup)
// 		const token = userToken || localStorage.getItem("UserToken");

// 		if (token && typeof token === "string") {
// 			try {
// 				const decoded = jwtDecode(token);
// 				setDecodedUser(decoded);
// 			} catch (err) {
// 				console.error("Failed to decode token:", err);
// 				setDecodedUser(null);
// 			}
// 		} else {
// 			setDecodedUser(null);
// 		}
// 	}, [userToken]); //  re-run when prop changes

// 	//  While waiting for decoded token, show loading or nothing
// 	if (!decodedUser) {
// 		console.log(" Waiting for token...");
// 		return <div>Loading...</div>; // or return <div>Loading...</div>;
// 	}

// 	const role = decodedUser?.role;
// 	console.log(" User decoded:", {
// 		name: decodedUser.name,
// 		email: decodedUser.email,
// 		role,
// 	});

// 	const isAdmin = ["headAdmin", "admin", "subAdmin"].includes(role);

// 	const menuItems = isAdmin
// 		? [
// 				{
// 					title: "Users",
// 					links: [
// 						{ name: "View All", path: "/user/all" },
// 						{ name: "Register Users", path: "/admin/user/register" },
// 						{ name: "Update Users", path: "/admin/user/update" },
// 					],
// 				},
// 				{
// 					title: "Material Requests",
// 					links: [
// 						{ name: "View All", path: "/material/request/all" },
// 						{ name: "Request Material", path: "/admin/material/request/" },
// 					],
// 				},
// 				{
// 					title: "Items",
// 					links: [
// 						{ name: "View All", path: "/admin/material/item/all" },
// 						{ name: "Add Items", path: "/admin/material/item/create" },
// 						{ name: "Update Items", path: "/admin/material/item/update" },
// 						{ name: "Items Usage", path: "/admin/material/item/usage" },
// 					],
// 				},
// 		  ]
// 		: [
// 				{
// 					title: "Material Requests",
// 					links: [
// 						{ name: "View All", path: "/material/request/all" },
// 						{ name: "Request Material", path: "/material/request/request/" },
// 					],
// 				},
// 		  ];

// 	return (
// 		<div className="content-container">
// 			<div className="nav-container">
// 				{/* Logo */}
// 				<div className="nav-logo">
// 					{location.pathname !== menuItems[0]?.links[0]?.path ? (
// 						<Link to={menuItems[0]?.links[0]?.path}>
// 							<img src={Logo} alt="logo" />
// 						</Link>
// 					) : (
// 						<img src={Logo} alt="logo" />
// 					)}
// 				</div>

// 				{/* Desktop Nav */}
// 				{screenWidth > 768 && (
// 					<>
// 						<ul className="nav-link-container desktop">
// 							{menuItems.map((m) => (
// 								<li className="nav-link-container-dropdown" key={m.title}>
// 									<span className="nav-link-container-dropdown-title">{m.title} ▾</span>
// 									<div className="nav-link-container-dropdown-link">
// 										{m.links.map((i) => (
// 											<Link key={i.path} to={i.path} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 												{i.name}
// 											</Link>
// 										))}
// 									</div>
// 								</li>
// 							))}
// 						</ul>

// 						{/* Logout */}
// 						<div className="desktop-logout">
// 							<Link
// 								to="/"
// 								onClick={() => {
// 									localStorage.removeItem("UserToken");
// 									window.location.reload(); //  ensure clean reload on logout
// 								}}>
// 								Log Out
// 							</Link>
// 						</div>
// 					</>
// 				)}

// 				{/* Mobile Burger Menu */}
// 				{screenWidth <= 768 && <Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />}
// 			</div>

// 			{/* Overlay */}
// 			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

// 			{/* Mobile Menu */}
// 			{screenWidth <= 768 && (
// 				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
// 					<X className="nav-burger-menu-close-btn" onClick={closeMenu} />
// 					<ul className="nav-burger-menu-links-container">
// 						{menuItems.map((m) => (
// 							<li className="nav-burger-menu-links-section" key={m.title}>
// 								<div className="nav-burger-menu-links-section-title">{m.title}</div>
// 								{m.links.map((i) => (
// 									<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 										{i.name}
// 									</Link>
// 								))}
// 							</li>
// 						))}

// 						{/* Mobile Logout */}
// 						<li className="nav-burger-menu-links-section logout">
// 							<Link
// 								to="/"
// 								onClick={() => {
// 									localStorage.removeItem("UserToken");
// 									closeMenu();
// 									window.location.reload();
// 								}}>
// 								Log Out
// 							</Link>
// 						</li>
// 					</ul>
// 				</div>
// 			)}

// 			<div className="site-content">{children}</div>
// 		</div>
// 	);
// }

// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import Logo from "../assets/WebsterSiteLogo.png";
// import Burger from "../assets/burgerMenu.svg?react";
// import X from "../assets/x.svg?react";
// import { jwtDecode } from "jwt-decode";

// export default function NavBar({ children, screenWidth, userToken }) {
// 	const [mobileOpen, setMobileOpen] = useState(false);
// 	const closeMenu = () => setMobileOpen(false);
// 	const location = useLocation();

// 	// Decode user role
// 	console.log("this is the users token", userToken);
// 	const decoded = jwtDecode(userToken);
// 	const role = decoded?.role;
// 	console.log("this is the users ", { name: decoded.name, email: decoded.email, role });
// 	console.log("this is the users role", role);

// 	// Helper: check if user is admin-level
// 	const isAdmin = ["headAdmin", "admin", "subAdmin"].includes(role);
// 	console.log("is admin", isAdmin);

// 	// "bryan@websterlock.com"

// 	// Menu configuration based on role
// 	const menuItems = isAdmin
// 		? [
// 				{
// 					title: "Users",
// 					links: [
// 						{ name: "View All", path: "/user/all" },
// 						{ name: "Register Users", path: "/admin/user/register" },
// 						{ name: "Update Users", path: "/admin/user/update" },
// 					],
// 				},
// 				{
// 					title: "Material Requests",
// 					links: [
// 						{ name: "View All", path: "/material/request/all" },
// 						{ name: "Request Material", path: "/admin/material/request/" },
// 					],
// 				},
// 				{
// 					title: "Items",
// 					links: [
// 						{ name: "View All", path: "/admin/material/item/all" },
// 						{ name: "Add Items", path: "/admin/material/item/create" },
// 						{ name: "Update Items", path: "/admin/material/item/update" },
// 						{ name: "Items Usage", path: "/admin/material/item/usage" },
// 					],
// 				},
// 		  ]
// 		: [
// 				{
// 					title: "Material Requests",
// 					links: [
// 						{ name: "View All", path: "/material/request/all" },
// 						{ name: "Request Material", path: "/material/request/request/" },
// 					],
// 				},
// 		  ];

// 	return (
// 		<div className="content-container">
// 			<div className="nav-container">
// 				{/* Logo on left */}
// 				<div className="nav-logo">
// 					{location.pathname !== menuItems[0]?.links[0]?.path ? (
// 						<Link to={menuItems[0]?.links[0]?.path}>
// 							<img src={Logo} alt="logo" />
// 						</Link>
// 					) : (
// 						<img src={Logo} alt="logo" />
// 					)}
// 				</div>

// 				{/* Desktop Navigation */}
// 				{screenWidth > 768 && (
// 					<>
// 						<ul className="nav-link-container desktop">
// 							{menuItems.map((m) => (
// 								<li className="nav-link-container-dropdown" key={m.title}>
// 									<span className="nav-link-container-dropdown-title">{m.title} ▾</span>
// 									<div className="nav-link-container-dropdown-link">
// 										{m.links.map((i) => (
// 											<Link key={i.path} to={i.path} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 												{i.name}
// 											</Link>
// 										))}
// 									</div>
// 								</li>
// 							))}
// 						</ul>

// 						{/* Log out */}
// 						<div className="desktop-logout">
// 							<Link to="/" onClick={() => localStorage.removeItem("UserToken")}>
// 								Log Out
// 							</Link>
// 						</div>
// 					</>
// 				)}

// 				{/* Mobile Burger Menu Icon */}
// 				{screenWidth <= 768 && <Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />}
// 			</div>

// 			{/* Overlay */}
// 			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

// 			{/* Mobile Menu */}
// 			{screenWidth <= 768 && (
// 				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
// 					<X className="nav-burger-menu-close-btn" onClick={closeMenu} />
// 					<ul className="nav-burger-menu-links-container">
// 						{menuItems.map((m) => (
// 							<li className="nav-burger-menu-links-section" key={m.title}>
// 								<div className="nav-burger-menu-links-section-title">{m.title}</div>
// 								{m.links.map((i) => (
// 									<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 										{i.name}
// 									</Link>
// 								))}
// 							</li>
// 						))}

// 						{/* Log out for mobile */}
// 						<li className="nav-burger-menu-links-section logout">
// 							<Link
// 								to="/"
// 								onClick={() => {
// 									localStorage.removeItem("UserToken");
// 									closeMenu();
// 								}}>
// 								Log Out
// 							</Link>
// 						</li>
// 					</ul>
// 				</div>
// 			)}

// 			<div className="site-content">{children}</div>
// 		</div>
// 	);
// }

// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import Logo from "../assets/WebsterSiteLogo.png";
// import Burger from "../assets/burgerMenu.svg?react";
// import X from "../assets/x.svg?react";
// import { jwtDecode } from "jwt-decode";

// export default function NavBar({ children, screenWidth, userToken }) {
// 	const [mobileOpen, setMobileOpen] = useState(false);
// 	const closeMenu = () => setMobileOpen(false);
// 	const location = useLocation(); // current URL path

// 	// decode user
// 	const decoded = jwtDecode(userToken);
// 	const role = decoded?.role;

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
// 				{ name: "Request Material", path: role === "headAdmin" ? "/admin/material/request/" : "/material/request/request/" },
// 			],
// 		},
// 		{
// 			title: "Items",
// 			links: [
// 				{ name: "View All", path: "/admin/material/item/all" },
// 				{ name: "Add Items", path: "/admin/material/item/create" },
// 				{ name: "Update Items", path: "/admin/material/item/update" },
// 				{ name: "Items Usage", path: "/admin/material/item/usage" },
// 			],
// 		},
// 	];

// 	return (
// 		<div className="content-container">
// 			<div className="nav-container">
// 				{/* Logo on left */}
// 				<div className="nav-logo">
// 					{location.pathname !== menuItems[0]?.links[0]?.path ? (
// 						<Link to={menuItems[0]?.links[0]?.path}>
// 							<img src={Logo} alt="logo" />
// 						</Link>
// 					) : (
// 						<img src={Logo} alt="logo" />
// 					)}
// 				</div>

// 				{/* Desktop nav */}
// 				{screenWidth > 768 && (
// 					<>
// 						<ul className="nav-link-container desktop">
// 							{menuItems.map((m) => (
// 								<li className="nav-link-container-dropdown" key={m.title}>
// 									<span className="nav-link-container-dropdown-title">{m.title} ▾</span>
// 									<div className="nav-link-container-dropdown-link">
// 										{m.links.map((i) => (
// 											<Link key={i.path} to={i.path} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 												{i.name}
// 											</Link>
// 										))}
// 									</div>
// 								</li>
// 							))}
// 						</ul>

// 						{/* Log out on far right */}
// 						<div className="desktop-logout">
// 							<Link to="/" onClick={() => localStorage.removeItem("UserToken")}>
// 								Log Out
// 							</Link>
// 						</div>
// 					</>
// 				)}

// 				{/* Burger icon for mobile */}
// 				{screenWidth <= 768 && (
// 					<>
// 						<Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />
// 					</>
// 				)}
// 			</div>

// 			{/* Overlay */}
// 			{mobileOpen && <div className="overlay" onClick={closeMenu}></div>}

// 			{/* Mobile menu */}
// 			{screenWidth <= 768 && (
// 				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
// 					<>
// 						<X className="nav-burger-menu-close-btn" onClick={closeMenu} />
// 					</>
// 					{/* </button> */}
// 					<ul className="nav-burger-menu-links-container">
// 						{menuItems.map((m) => (
// 							<li className="nav-burger-menu-links-section" key={m.title}>
// 								<div className="nav-burger-menu-links-section-title">{m.title}</div>
// 								{m.links.map((i) => (
// 									<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
// 										{i.name}
// 									</Link>
// 								))}
// 							</li>
// 						))}

// 						{/* Log out in mobile */}
// 						<li className="nav-burger-menu-links-section logout">
// 							<Link
// 								to="/"
// 								onClick={() => {
// 									localStorage.removeItem("UserToken");
// 									closeMenu();
// 								}}>
// 								Log Out
// 							</Link>
// 						</li>
// 					</ul>
// 				</div>
// 			)}

// 			<div className="site-content">{children}</div>
// 		</div>
// 	);
// }
