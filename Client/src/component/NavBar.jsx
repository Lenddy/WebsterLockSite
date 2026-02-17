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

	// const { users, loading, error } = useUsers();
	// const { requests: mRequests, loading:mRequestsLoading, error:mRequestsError } = useMaterialRequests();
	// const { items, loading:itemLoading, error:itemError } = useItemGroups();

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

	// Close on outside click
	useEffect(() => {
		function handleClickOutside(e) {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setConfigOpen(false); // CLOSE ONLY if clicked outside
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Keyboard support
	useEffect(() => {
		const handleKey = (e) => {
			if (!configOpen) return;

			if (e.key === "Escape") {
				setConfigOpen(false);
			}
		};

		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [configOpen]);

	const role = decodedUser?.role;
	// const isAdmin = useMemo(() => ["headAdmin", "admin", "subAdmin"].includes(role), [role]);
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

	//REVIEW - so i already fetch users requests and items, so why am i refetching them in nav bar
	// also find out why

	const menuItems = useMemo(
		() =>
			isAdmin
				? [
						{
							title: t("Users"), //Users,
							links: [
								{ name: t("view-all"), path: "/user/all" },
								{ name: t("register-users"), path: "/admin/user/register" },
								{ name: t("update-users"), path: "/admin/user/update" },
								// { name: t("update-profile"), path: `/user/${decodedUser?.userId}/update` },
							],
						},
						{
							title: t("material-requests"),
							links: [
								{ name: t("view-all"), path: "/material/request/all" },
								{ name: t("request-material"), path: "/admin/material/request" },
								// "Request Material"
							],
						},
						{
							title: t("items"),
							links: [
								{ name: t("view-all"), path: "/admin/material/item/all" },
								{ name: t("add-items"), path: "/admin/material/item/create" },
								{ name: t("update-items"), path: "/admin/material/item/update" },
								{ name: t("items-usage"), path: "/admin/material/item/usage" },
							],
						},
						// {
						// 	title: "Language",
						// 	links: [{ name: "English" }, { name: "Español" }],
						// },
					]
				: [
						// {
						// 	title: t("Users"),
						// 	links: [{ name: t("update-profile"), path: `/user/${decodedUser?.userId}/update` }],
						// },
						{
							title: t("material-requests"),
							links: [
								{ name: t("view-all"), path: "/material/request/all" },
								{ name: t("request-material"), path: "/material/request/request" },
							],
						},
						// {
						// 	title: t("items"),
						// 	links: [
						// 		{ name: t("view-all"), path: "/admin/material/item/all" },
						// 		{ name: t("items-usage"), path: "/admin/material/item/usage" },
						// 	],
						// },
						// {
						// 	title: "Language",
						// 	links: [{ name: "English" }, { name: "Español" }],
						// },
					],
		[isAdmin, decodedUser?.userId, t] //, i18n.language
	);

	// const menuItems = useMemo(
	// 	() => [
	// 		// {
	// 		// 	title: t("Users"),
	// 		// 	links: [
	// 		// 		{
	// 		// 			name: t("view-all"),
	// 		// 			path: "/user/all",
	// 		// 			permission: "users:read:any",
	// 		// 		},
	// 		// 		{
	// 		// 			name: t("register-users"),
	// 		// 			path: "/admin/user/register",
	// 		// 			permission: "users:create:any",
	// 		// 		},
	// 		// 		{
	// 		// 			name: t("update-users"),
	// 		// 			path: "/admin/user/update",
	// 		// 			permission: "users:update:any",
	// 		// 		},
	// 		// 	],
	// 		// },

	// 		{
	// 			title: t("material-requests"),
	// 			links: [
	// 				{
	// 					name: t("view-all"),
	// 					path: "/material/request/all",
	// 					// permission: "requests:read:any", // will fallback to own logic if needed
	// 					permission: "requests:read:own", // will fallback to own logic if needed
	// 				},
	// 				{
	// 					name: t("request-material"),
	// 					path: roleRank[decodedUser?.role] >= 3 ? "/admin/material/request" : "/material/request/request",
	// 					permission: "requests:create:own",
	// 				},
	// 			],
	// 		},
	// 		{
	// 			title: t("items"),
	// 			links: [
	// 				{
	// 					name: t("view-all"),
	// 					path: "/admin/material/item/all",
	// 					permission: "items:read:any",
	// 				},
	// 				{
	// 					name: t("add-items"),
	// 					path: "/admin/material/item/create",
	// 					permission: "items:create:any",
	// 				},
	// 				{
	// 					name: t("update-items"),
	// 					path: "/admin/material/item/update",
	// 					permission: "items:update:any",
	// 				},
	// 				{
	// 					name: t("items-usage"),
	// 					path: "/admin/material/item/usage",
	// 					permission: "items:read:any",
	// 				},
	// 			],
	// 		},
	// 	],
	// 	[decodedUser?.role, t]
	// );

	// find out why the links are not showing for the normal users i would say that it is because of line 227

	// "so has permission is not showing for a users   in material requests find out why because it is showing for the others

	// const getAccess = (link) => {
	// 	console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!start!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
	// 	console.log("this is the link permissions ", link.permission);
	// 	console.log("this is the decoded user ", decodedUser);

	// 	const hasPermission = link.permission ? can(decodedUser, link.permission) : true;

	// 	console.log("has permission", hasPermission);

	// 	const hasRank = !link.minRole || roleRank[decodedUser?.role] >= roleRank[link.minRole];
	// 	// console.log("this is the rank", hasRank);

	// 	console.log("this is to be return {visible: hasPermission, enabled: hasPermission && hasRank,}", {
	// 		link,
	// 		visible: hasPermission,
	// 		enabled: hasPermission && hasRank,
	// 	});
	// 	return {
	// 		visible: hasPermission,
	// 		enabled: hasPermission && hasRank,
	// 	};
	// };

	// ! tests the test enviroment for any problem
	// also add the final requierments for the nav var so that if you dont have permission you cant go to the route
	// and test everything
	// and fix the last problem then updaload

	const closeMenu = () => setMobileOpen(false);

	const handleLogout = () => {
		const confirmLogout = window.confirm(t("are-you-sure-you-want-to-log-out"));

		if (confirmLogout) {
			// window.location.reload();
			setUserToken(null);
			// navigate("/");
		}
		if (!confirmLogout) return;

		//   localStorage.removeItem("token");
		//   navigate("/login");
	};

	// const handleLogout = () => {
	// 	setUserToken(null);
	// 	window.location.reload();
	// };

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

	const canReadUsers = can(decodedUser, "users:read:any");
	const canCreateUsers = can(decodedUser, "users:create:any");
	const canUpdateUsers = can(decodedUser, "users:update:any");

	const isLinkDisabled = (path) => {
		// !!!
		// View all users
		if (path === "/admin/users") {
			return !canReadUsers;
		}

		// Register user
		if (path === "/admin/user/register") {
			return !canCreateUsers;
		}

		// Update user
		if (path.startsWith("/admin/user/") && path.endsWith("/update")) {
			return !canUpdateUsers;
		}

		// /admin/material/item/all
		// /admin/material/item/:itemId
		// /admin/material/item/:itemId?/update

		// // !!!
		// // View all users
		// if (path === "") {
		// 	return !canReadUsers;
		// }

		// // Register user
		// if (path === "/admin/user/register") {
		// 	return !canCreateUsers;
		// }

		// // Update user
		// if (path.startsWith("/admin/user/") && path.endsWith("/update")) {
		// 	return !canUpdateUsers;
		// }

		return false;
	};

	return (
		<div className="content-container">
			<div className="nav-container">
				<div className="nav-logo">
					<Link to={isAdmin ? menuItems[1]?.links[0]?.path : menuItems[0]?.links[1]?.path}>
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
										{
											// !the new way of doing it  fix or use something else
											// m.links.map((i) => {
											// 	// console.log("this is i from the m.links.map", i);
											// 	const access = getAccess(i);
											// 	// const access = true;

											// 	// if (!access.visible) return null;

											// 	const disabled = !access.enabled || i.path === "/admin/material/item/create" || i.path === "/admin/material/item/update" || location.pathname === i.path;

											// 	return (
											// 		<Link
											// 			key={i.path}
											// 			to={access.enabled ? i.path : "#"}
											// 			onClick={(e) => {
											// 				if (!access.enabled) e.preventDefault();
											// 				closeMenu();
											// 			}}
											// 			className={disabled ? "nav-bar-link-disabled" : ""}>
											// 			{i.name}
											// 		</Link>
											// 	);
											// })

											m.links.map((i) =>
												// role === "admin" || role === "subAdmin"
												isAdmin ? (
													<Link
														key={i.path}
														to={i.path == "/admin/material/item/create" || i.path == "/admin/material/item/update" ? "" : i.path}
														onClick={closeMenu}
														className={
															i.path == "/admin/material/item/create" || i.path == "/admin/material/item/update" || location.pathname === i.path ? "nav-bar-link-disabled" : ""

															// location.pathname === i.path ? "nav-bar-link-disabled" : ""
														}>
														{i.name}
													</Link>
												) : (
													<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
														{i.name}
													</Link>
												)
											)

											// m.links.map((i) => {
											// 	const disabled = isLinkDisabled(i.path);

											// 	return (
											// 		<Link key={i.path} to={disabled ? "#" : i.path} onClick={(e) => disabled && e.preventDefault()} className={`${location.pathname === i.path ? "nav-bar-link-active" : ""} ${disabled ? "nav-bar-link-disabled" : ""}`} aria-disabled={disabled}>
											// 			{i.name}
											// 		</Link>
											// 	);
											// })
										}
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

								{
									// !the new way of doing it  fix or use something else
									// m.links.map((i) => {
									// 	const access = getAccess(i);

									// 	if (!access.visible) return null;

									// 	const disabled = !access.enabled || i.path === "/admin/material/item/create" || i.path === "/admin/material/item/update" || location.pathname === i.path;

									// 	return (
									// 		<Link
									// 			key={i.path}
									// 			to={access.enabled ? i.path : "#"}
									// 			onClick={(e) => {
									// 				if (!access.enabled) e.preventDefault();
									// 				closeMenu();
									// 			}}
									// 			className={disabled ? "nav-bar-link-disabled" : ""}>
									// 			{i.name}
									// 		</Link>
									// 	);
									// })

									m.links.map((i) =>
										role === "admin" || role === "subAdmin" ? (
											<Link
												key={i.path}
												to={i.path == "/admin/material/item/create" || i.path == "/admin/material/item/update" ? "" : i.path}
												onClick={closeMenu}
												className={
													i.path == "/admin/material/item/create" || i.path == "/admin/material/item/update" || location.pathname === i.path ? "nav-bar-link-disabled" : ""

													// location.pathname === i.path ? "nav-bar-link-disabled" : ""
												}>
												{i.name}
											</Link>
										) : (
											<Link key={i.path} to={i.path} onClick={closeMenu} className={location.pathname === i.path ? "nav-bar-link-disabled" : ""}>
												{i.name}
											</Link>
										)
									)
								}
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

			<div className="site-content">
				{!pageLoading && currentRefetch && <RefetchButton refetch={currentRefetch} />}
				{children}
			</div>
		</div>
	);
}
