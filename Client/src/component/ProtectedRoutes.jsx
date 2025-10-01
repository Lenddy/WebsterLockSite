import { Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

import NavBar from "./NavBar";

export default function ProtectedRoutes({ screenWidth, userToken }) {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [checking, setChecking] = useState(true); // track async check

	useEffect(() => {
		const token = localStorage.getItem("UserToken");
		setIsLoggedIn(!!token);
		setChecking(false);
	}, []);

	if (checking) return null; // or a loader

	return isLoggedIn ? (
		<NavBar screenWidth={screenWidth} userToken={userToken}>
			<Outlet />
		</NavBar>
	) : (
		<Navigate to="/" replace />
	);
}
