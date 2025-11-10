import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/WebsterSiteLogo.png";
import Burger from "../assets/burgerMenu.svg?react";
import X from "../assets/x.svg?react";
import { get_all_users } from "../../graphQL/queries/queries";
import { get_all_material_requests } from "../../graphQL/queries/queries";
import { get_all_item_groups } from "../../graphQL/queries/queries";
import { useQuery } from "@apollo/client";
import RefetchButton from "./utilities/RefetchButton";

export default function NavBar({ children, screenWidth }) {
	const { userToken, setUserToken, loading: authLoading } = useAuth();
	const [decodedUser, setDecodedUser] = useState(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const location = useLocation();

	const { refetch: URefetch } = useQuery(get_all_users);
	const { refetch: mRRefetch } = useQuery(get_all_material_requests);
	const { refetch: iGRefetch } = useQuery(get_all_item_groups);

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
						{ name: "Request Material", path: "/admin/material/request" },
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
						{ name: "Request Material", path: "/material/request/request" },
					],
				},
		  ];

	// --- 1) Compute which refetch function to use ---
	const getRefetchFn = () => {
		if (menuItems[0]?.links?.some((p) => location?.pathname?.includes(p?.path))) {
			return URefetch;
		}
		if (menuItems[1]?.links?.some((p) => location?.pathname?.includes(p?.path))) {
			return mRRefetch;
		}
		if (menuItems[2]?.links?.some((p) => location?.pathname?.includes(p?.path))) {
			return iGRefetch;
		}
		return null; // <-- no match
	};

	const currentRefetch = getRefetchFn();

	return (
		<div className="content-container">
			<div className="nav-container">
				<div className="nav-logo">
					<Link to={isAdmin ? menuItems[1]?.links[0]?.path : menuItems[0]?.links[0]?.path}>
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

			<div className="site-content">
				{/* / --- 2) Conditionally render RefetchButton only if there’s a match --- */}
				{currentRefetch && <RefetchButton refetch={currentRefetch} />}

				{children}
			</div>
		</div>
	);
}
