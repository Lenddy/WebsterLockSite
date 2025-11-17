import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/WebsterSiteLogo.png";
import Burger from "../assets/burgerMenu.svg?react";
import X from "../assets/x.svg?react";
import { get_one_user, get_all_users, get_all_material_requests, get_all_item_groups } from "../../graphQL/queries/queries";
import { useQuery } from "@apollo/client";
import RefetchButton from "./utilities/RefetchButton";

export default function NavBar({ children, screenWidth }) {
	const { userToken, setUserToken, loading: authLoading, pageLoading } = useAuth();
	const [decodedUser, setDecodedUser] = useState(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const location = useLocation();

	// Decode token once available
	useEffect(() => {
		if (!userToken) {
			setDecodedUser(null);
			return;
		}
		try {
			setDecodedUser(jwtDecode(userToken));
		} catch (err) {
			console.error("Failed to decode token:", err);
			setDecodedUser(null);
		}
	}, [userToken]);

	const role = decodedUser?.role;
	const isAdmin = useMemo(() => ["headAdmin", "admin", "subAdmin"].includes(role), [role]);

	// Choose which user query to run; skip until decodedUser is present.
	const shouldUseAllUsers = !!decodedUser && isAdmin;
	const { refetch: allUsersRefetch } = useQuery(get_all_users, { skip: !shouldUseAllUsers || !decodedUser });
	const { refetch: oneUserRefetch } = useQuery(get_one_user, {
		skip: shouldUseAllUsers || !decodedUser,
		variables: { id: decodedUser?.userId },
	});
	const usersRefetch = shouldUseAllUsers ? allUsersRefetch : oneUserRefetch;

	// Other queries (skipped until decodedUser to avoid unnecessary loads)
	const { refetch: mRRefetch } = useQuery(get_all_material_requests, { skip: !decodedUser });
	const { refetch: iGRefetch } = useQuery(get_all_item_groups, { skip: !decodedUser });

	const menuItems = useMemo(
		() =>
			isAdmin
				? [
						{
							title: "Users",
							links: [
								{ name: "View All", path: "/user/all" },
								{ name: "Register Users", path: "/admin/user/register" },
								{ name: "Update Users", path: "/admin/user/update" },
								{ name: "Update Profile", path: `/user/${decodedUser?.userId}/update` },
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
							title: "Users",
							links: [{ name: "Update Profile", path: `/user/${decodedUser?.userId}/update` }],
						},
						{
							title: "Material Requests",
							links: [
								{ name: "View All", path: "/material/request/all" },
								{ name: "Request Material", path: "/material/request/request" },
							],
						},
				  ],
		[isAdmin, decodedUser?.userId]
	);

	const closeMenu = () => setMobileOpen(false);
	const handleLogout = () => {
		setUserToken(null);
		window.location.reload();
	};

	if (authLoading) return null;
	if (!decodedUser) return null; // ProtectedRoutes will redirect

	// Map the current location to the correct refetch function
	const currentRefetch = (() => {
		// helper: does this menu contain the current route?
		const matchesMenu = (m) => m?.links?.some((p) => location?.pathname?.includes(p?.path));

		if (matchesMenu(menuItems[0])) return usersRefetch;
		if (matchesMenu(menuItems[1])) return mRRefetch;
		if (matchesMenu(menuItems[2])) return iGRefetch;
		return null;
	})();

	return (
		<div className="content-container">
			<div className="nav-container">
				<div className="nav-logo">
					<Link to={isAdmin ? menuItems[1]?.links[0]?.path : menuItems[1]?.links[1]?.path}>
						<img src={Logo} alt="logo" />
					</Link>
				</div>

				{screenWidth > 768 ? (
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
				) : (
					<Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />
				)}
			</div>

			{mobileOpen && <div className="overlay" onClick={closeMenu} />}

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
				{!pageLoading && currentRefetch && <RefetchButton refetch={currentRefetch} />}
				{children}
			</div>
		</div>
	);
}
