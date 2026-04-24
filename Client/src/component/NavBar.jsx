import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/WebsterSiteLogo.png";
import Burger from "../assets/burgerMenu.svg?react";
import X from "../assets/x.svg?react";
import Settings from "../assets/settings.svg?react";
import { get_one_user, get_all_users, get_all_material_requests, get_all_item_groups } from "../../graphQL/queries/queries";

import { useQuery } from "@apollo/client";
import RefetchButton from "./utilities/RefetchButton";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { can } from "./utilities/can";
import { roleRank } from "./utilities/role.config";
// import { useUsers } from "../../context/UsersContext";
// import { useMaterialRequests } from "../../../src/context/MaterialRequestContext";
// import { useItemGroups } from "../../../context/ItemGroupContext";

export default function NavBar({ children, screenWidth }) {
	const { userToken, setUserToken, loading: authLoading, pageLoading } = useAuth();
	const [decodedUser, setDecodedUser] = useState(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [configOpen, setConfigOpen] = useState(false);
	const containerRef = useRef(null);
	const location = useLocation();

	const { t } = useTranslation();

	const languages = [
		{
			code: "en",
			name: "English",
		},
		{
			code: "es",
			name: "Español",
		},
	];

	const navigate = useNavigate();

	// Decode token once available
	useEffect(() => {
		// checks if there is a token
		if (!userToken) {
			setDecodedUser(null);
			return;
		}
		try {
			// decodes the token and sets it to a state variable
			setDecodedUser(jwtDecode(userToken));
		} catch (err) {
			console.error("Failed to decode token:", err);
			setDecodedUser(null);
		}
	}, [userToken]);

	// closes the gear menu when you click out side if it is open
	useEffect(() => {
		// takes a click even that closes the gear menu
		function handleClickOutside(e) {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setConfigOpen(false); // CLOSE ONLY if clicked outside
			}
		}

		// removes
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// closes the gear menu if the Escape key is press
	useEffect(() => {
		const handleKey = (e) => {
			if (!configOpen) return;

			if (e.key === "Escape") {
				setConfigOpen(false);
			}
		};

		// removes the event listener for the key press
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [configOpen]);

	// setting varialbe for easy access to info about the user
	const role = decodedUser?.role;
	const isAdmin = useMemo(() => roleRank[role] >= 3, [role]);

	// Choose which user query to run; skip until decodedUser is present.
	const shouldUseAllUsers = !!decodedUser && isAdmin && decodedUser.permissions.includes("users:read:any");
	const { refetch: allUsersRefetch } = useQuery(get_all_users, { skip: !shouldUseAllUsers || !decodedUser });
	//! this one is fine
	const { refetch: oneUserRefetch } = useQuery(get_one_user, {
		skip: shouldUseAllUsers || !decodedUser,
		variables: { id: decodedUser?.userId },
	});

	const usersRefetch = shouldUseAllUsers ? allUsersRefetch : oneUserRefetch;

	// Other queries (skipped until decodedUser to avoid unnecessary loads)
	const { refetch: mRRefetch } = useQuery(get_all_material_requests, { skip: !decodedUser });
	const { refetch: iGRefetch } = useQuery(get_all_item_groups, { skip: !decodedUser });

	// stores all the that are available routes
	const menuItems = useMemo(
		() => [
			{
				title: t("Users"),
				links: [
					{
						name: t("view-all"),
						path: "/user/all",
						permission: "users:read:any",
					},
					{
						name: t("register-users"),
						path: "/admin/user/register",
						permission: "users:create:any",
					},
					{
						name: t("update-users"),
						path: "/admin/user/update",
						permission: "users:update:any",
					},
				],
			},

			{
				title: t("material-requests"),
				links: [
					{
						name: t("view-all"),
						path: "/material/request/all",
						// permission: ["requests:read:any", "requests:read:own"],
						permission: ["requests:read:any", "requests:read:own"],
					},
					{
						name: t("request-material"),
						path: roleRank[decodedUser?.role] >= 3 ? "/admin/material/request" : "/material/request",
						permission: ["requests:create:any", "requests:create:own"],
					},
				],
			},

			{
				title: t("items"),
				links: [
					{
						name: t("view-all"),
						path: "/admin/material/item/all",
						permission: "items:read:any",
					},
					{
						name: t("add-items"),
						path: "/admin/material/item/create",
						permission: "items:create:any",
					},
					{
						name: t("update-items"),
						path: "/admin/material/item/update",
						permission: "items:update:any",
					},
					{
						name: t("items-usage"),
						path: "/admin/material/item/usage",
						permission: "items:read:any",
					},
				],
			},
		],
		[decodedUser?.role, t]
	);

	// decides if a user gets accesses to a routes base on if they have permission or not
	const getAccess = (link) => {
		// makes sure that link.permission is an array
		const permissions = Array.isArray(link.permission) ? link.permission : [link.permission];
		// checks if the users has
		const hasPermission = permissions.some((perm) => can(decodedUser, perm, { ownerId: decodedUser.userId }));

		// if the users has permission it allows them to go to the route
		return {
			visible: true,
			enabled: hasPermission,
		};
	};

	const closeMenu = () => setMobileOpen(false);

	// logs the users out
	const handleLogout = () => {
		// asks the user if they are sure that they want to log out
		const confirmLogout = window.confirm(t("are-you-sure-you-want-to-log-out"));
		// clears the token if they confirm that they want to log out
		if (confirmLogout) {
			setUserToken(null);
		}
		// does nothing if they chose to stay sing in
		if (!confirmLogout) return;
	};

	///makes sure that the users token is in local storage  or loading
	if (authLoading) return null;
	if (!decodedUser) return null; // ProtectedRoutes will redirect

	// Refetch data base on where the user is on the app
	const currentRefetch = (() => {
		//
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
					<Link to={menuItems[1]?.links[0]?.path}>
						<img src={Logo} alt="logo" />
					</Link>
				</div>

				{screenWidth > 768 ? (
					<>
						<ul className="nav-link-container desktop">
							{/* renders  the dropdown  of routes from menuitem*/}
							{menuItems.map((m) => (
								<li className="nav-link-container-dropdown" key={m.title}>
									<span className="nav-link-container-dropdown-title">{m.title} ▾</span>
									<div className="nav-link-container-dropdown-link">
										{/* gets the links and  makes sure if the users is able to access them or not  */}
										{m.links.map((link) => {
											const access = getAccess(link);

											const isCurrentRoute = location.pathname === link.path;
											const disabled = !access.enabled || isCurrentRoute;

											return (
												<Link
													key={link.path}
													to={link.path}
													onClick={(e) => {
														if (disabled) {
															e.preventDefault();
														}
													}}
													className={disabled ? "nav-bar-link-disabled" : ""}>
													{link.name}
												</Link>
											);
										})}
									</div>
								</li>
							))}
						</ul>

						<div className="desktop-logout">
							<ul className="nav-link-container-config desktop">
								<li
									className={`nav-link-container-dropdown-config ${configOpen ? "active" : ""}`}
									onClick={() => setConfigOpen(!configOpen)} // toggle only when clicking header
									ref={containerRef}>
									<span className="nav-link-container-dropdown-title-config">
										<Settings className={`settings ${configOpen ? "active" : ""}`} />▾
									</span>

									<div className="nav-link-container-dropdown-link-config" onClick={(e) => e.stopPropagation()}>
										{/* renders the language btns in  */}
										{languages.map((language) => (
											<Link onClick={() => i18n.changeLanguage(language.code)} key={language.code} className={localStorage.getItem("i18nextLng") === language.code ? "nav-bar-link-disabled" : ""}>
												{language.name}
											</Link>
										))}

										<Link to={`/user/${decodedUser?.userId}/update`} onClick={() => setConfigOpen(!configOpen)} className={location.pathname === `/user/${decodedUser?.userId}/update` ? "nav-bar-link-disabled" : ""}>
											{t("update-profile")}
										</Link>

										<Link onClick={handleLogout} className="Log-out">
											{t("log-out")}
										</Link>
									</div>
								</li>
							</ul>
						</div>
					</>
				) : (
					// opens the burger menu
					<Burger className="nav-burger-menu" onClick={() => setMobileOpen(true)} />
				)}
			</div>
			{/* adds an overlay if the screen is smaller than 769 pixels */}
			{mobileOpen && <div className="overlay" onClick={closeMenu} />}

			{/* changes the navbar if the screen is smaller than or === 768px  and it renders the same info from the previous nav bar*/}
			{screenWidth <= 768 && (
				<div className={`nav-burger-menu-content-container ${mobileOpen ? "open" : ""}`}>
					<X className="nav-burger-menu-close-btn" onClick={closeMenu} />
					<ul className="nav-burger-menu-links-container">
						{menuItems.map((m) => (
							<li className="nav-burger-menu-links-section" key={m.title}>
								<div className="nav-burger-menu-links-section-title">{m.title}</div>

								{m.links.map((link) => {
									const access = getAccess(link);

									const isCurrentRoute = location.pathname === link.path;
									const disabled = !access.enabled || isCurrentRoute;

									return (
										<Link
											key={link.path}
											//  to={access.enabled ? link.path : ""}
											to={link.path}
											onClick={(e) => {
												if (disabled) {
													e.preventDefault();
												}
											}}
											//  className={!access.enabled ? "nav-bar-link-disabled" : location.pathname === link.path ? "nav-bar-link-active" : ""}
											className={disabled ? "nav-bar-link-disabled" : location.pathname === link.path ? "nav-bar-link-active" : ""}>
											{link.name}
										</Link>
									);
								})}
							</li>
						))}

						<li className="nav-burger-menu-links-section">
							<div className="nav-burger-menu-links-section-title mobile">
								{" "}
								<Settings className={`nav-link-container-dropdown-title-config settings mobile`} />
							</div>

							{/* <div className="nav-link-container-dropdown-link"> */}
							{languages.map((language) => (
								<Link className={localStorage.getItem("i18nextLng") === language.code ? "nav-bar-link-disabled" : ""} onClick={() => i18n.changeLanguage(language.code)} key={language.code}>
									{language.name}
								</Link>
							))}

							<Link to={`/user/${decodedUser?.userId}/update`} className={`nav-burger-menu-links-section logout  ${location.pathname === `/user/${decodedUser?.userId}/update` ? "nav-bar-link-disabled" : ""}`} onClick={closeMenu}>
								{t("update-profile")}
							</Link>

							<Link className="nav-burger-menu-links-section logout" onClick={handleLogout}>
								{t("log-out")}
							</Link>
						</li>
					</ul>
				</div>
			)}

			{/* wrapper for all the components so that nav bar can be show in every child componen */}
			<div className="site-content">
				{!pageLoading && currentRefetch && <RefetchButton refetch={currentRefetch} />}
				{children}
			</div>
		</div>
	);
}
