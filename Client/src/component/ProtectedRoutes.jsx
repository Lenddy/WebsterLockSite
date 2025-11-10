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
