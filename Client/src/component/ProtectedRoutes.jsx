import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import NavBar from "./NavBar";

export default function ProtectedRoutes({ screenWidth }) {
	const { userToken, loading } = useAuth(); //  get loading from context

	if (loading) return <div>Loading...</div>; //  wait until context finishes initializing

	return userToken ? (
		<NavBar screenWidth={screenWidth}>
			<Outlet />
		</NavBar>
	) : (
		<Navigate to="/" replace />
	);
}

// import { Navigate, Outlet } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { useAuth } from "../context/AuthContext"; //  use context
// import NavBar from "./NavBar";

// export default function ProtectedRoutes({ screenWidth }) {
// 	const { userToken } = useAuth(); // get token globally
// 	const [checking, setChecking] = useState(true); // track async check
// 	const [isLoggedIn, setIsLoggedIn] = useState(false);

// 	// useEffect(() => {
// 	// 	const token = localStorage.getItem("UserToken");
// 	// 	setIsLoggedIn(!!token);
// 	// 	setChecking(false);
// 	// }, []);

// 	useEffect(() => {
// 		const storedToken = localStorage.getItem("UserToken");
// 		if (storedToken) {
// 			setIsLoggedIn(true);
// 		} else {
// 			setIsLoggedIn(false);
// 		}
// 		setChecking(false);
// 	}, [userToken]);

// 	if (checking) return <div>Loading...</div>;

// 	return isLoggedIn ? (
// 		<NavBar screenWidth={screenWidth}>
// 			<Outlet />
// 		</NavBar>
// 	) : (
// 		<Navigate to="/" replace />
// 	);
// }

// import { Navigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";

// export const ProtectedRoute = ({ children }) => {
// 	const { user, loading } = useAuth();

// 	if (loading) return <div>Loading...</div>; // optional spinner

// 	if (!user) return <Navigate to="/login" replace />;

// 	return children;
// };
