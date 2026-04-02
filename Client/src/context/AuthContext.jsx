// AuthContext.jsx
import { createContext, useState, useEffect, useContext } from "react";
import { useSubscription, gql } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { USER_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions"; // adjust import path
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
// import { wsClient } from "../../graphQL/apolloClient";
// import { wsClient } from "../../graphQL/apolloClient";
// import i18n from "../../i18n";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	// State management for authentication
	const [userToken, setUserToken] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pageLoading, setPageLoading] = useState(false);
	const currentRoutePath = location.pathname;
	const [wsDisconnected, setWsDisconnected] = useState(false);

	// Get translation function from i18n
	const { t } = useTranslation();

	// Handle WebSocket disconnection - show error toast notification
	useEffect(() => {
		if (!wsDisconnected) return;

		toast.error(
			({ closeToast }) => (
				<div>
					<p>
						{t("connection-to-the-serve-was-lost-make-sure-that-you-are-connected-to-the-internet")}
						<br />
						{t("please-way-a-couple-of-minutes-then-please-refresh-to-continue")}
						<br />
						<span style={{ color: "red" }}>{t("to-get-live-data-and-to-not-potentially-lose-your-changes")}</span>

						<br />
						{t("if-this-problem-continues-please-contact-the-site-manager")}
					</p>

					<button
						onClick={() => {
							closeToast();
							window.location.reload();
						}}
						style={{ marginTop: "8px" }}>
						OK
					</button>
				</div>
			),
			{
				autoClose: false,
				closeOnClick: false,
				draggable: false,
			}
		);
	}, [wsDisconnected]);

	// Load token from localStorage on component mount
	useEffect(() => {
		const storedToken = localStorage.getItem("userToken");
		if (storedToken) {
			setUserToken(storedToken);
		}
		setLoading(false);
	}, []);

	// Sync userToken changes to localStorage
	useEffect(() => {
		if (userToken) {
			localStorage.setItem("userToken", userToken);
		} else {
			localStorage.removeItem("userToken");
		}
	}, [userToken]);

	// Persist token to localStorage and optionally reconnect WebSocket with new token
	useEffect(() => {
		if (userToken) {
			localStorage.setItem("userToken", userToken);
		} else {
			localStorage.removeItem("userToken");
		}
	}, [userToken]);

	return (
		<AuthContext.Provider
			value={{
				userToken,
				setUserToken,
				loading,
				pageLoading,
				setPageLoading,
				wsDisconnected,
				setWsDisconnected,
			}}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
