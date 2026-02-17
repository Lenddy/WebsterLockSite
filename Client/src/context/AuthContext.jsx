// AuthContext.jsx
import { createContext, useState, useEffect, useContext } from "react";
import { useSubscription, gql } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { USER_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions"; // adjust import path
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
// import { wsClient } from "../../graphQL/apolloClient";
// import { wsClient } from "../../graphQL/apolloClient";
// import i18n from "../../i18n";
import { useTranslation } from "react-i18next";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	// console.log("started auth context at", new Date());
	const [userToken, setUserToken] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pageLoading, setPageLoading] = useState(false);
	const currentRoutePath = location.pathname;
	const [wsDisconnected, setWsDisconnected] = useState(false);

	const { t } = useTranslation();

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

	// Load token from localStorage on mount
	useEffect(() => {
		const storedToken = localStorage.getItem("userToken");
		if (storedToken) {
			setUserToken(storedToken);
			// console.log(" ", userToken);
		}
		setLoading(false);
	}, []);

	// console.log("this is the token ", userToken);
	// Keep localStorage synced
	useEffect(() => {
		if (userToken) {
			localStorage.setItem("userToken", userToken);
		} else {
			localStorage.removeItem("userToken");
		}
	}, [userToken]);

	useEffect(() => {
		if (userToken) {
			localStorage.setItem("userToken", userToken);

			// 🔥 Force WS reconnection with new token
			// try {
			// 	wsClient.dispose();
			// } catch {}
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
