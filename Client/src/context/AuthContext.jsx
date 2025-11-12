// AuthContext.jsx
import { createContext, useState, useEffect, useContext } from "react";
import { useSubscription, gql } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { USER_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions"; // adjust import path
import { useLocation } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [userToken, setUserToken] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pageLoading, setPageLoading] = useState(false);
	const currentRoutePath = location.pathname;
	// Load token from localStorage on mount
	useEffect(() => {
		const storedToken = localStorage.getItem("UserToken");
		if (storedToken) {
			setUserToken(storedToken);
		}
		setLoading(false);
	}, []);

	// Keep localStorage synced
	useEffect(() => {
		if (userToken) {
			localStorage.setItem("UserToken", userToken);
		} else {
			localStorage.removeItem("UserToken");
		}
	}, [userToken]);

	// Decode the token to get the current user's ID
	const currentUserId = userToken ? jwtDecode(userToken).userId : null;

	// Listen for USER_CHANGE_SUBSCRIPTION (same event you use everywhere else)
	useSubscription(USER_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			console.log("📡 [AuthContext] Subscription data:", subscriptionData);

			const changeEvent = subscriptionData?.data?.onUserChange;
			if (!changeEvent) return;

			const { eventType, changeType, change, changes, updateBy } = changeEvent;

			// Normalize into array for consistency
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			if (!changesArray.length) return;

			for (const updatedUser of changesArray) {
				if (eventType !== "updated") continue; // only handle updates

				const newToken = updatedUser?.token;
				const updatedUserId = updatedUser?.id;

				//  Only update if the changed user is the logged-in one
				if (currentUserId && updatedUserId === currentUserId && newToken) {
					console.log("🔑 [AuthContext] Token updated via PubSub — refreshing context...");
					setUserToken(newToken);
					console.log("updateBy", updateBy);
					if (updateBy !== currentUserId) {
						alert("User profile has been updated (from the context)");
					}

					// Optional: toast or banner
					// showToast("Your session was refreshed after profile update");
				}
			}
		},

		onError: (err) => {
			console.error("🚨 [AuthContext] Subscription error:", err);
		},
	});

	return (
		<AuthContext.Provider
			value={{
				userToken,
				setUserToken,
				loading,
				pageLoading,
				setPageLoading,
			}}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);

// previous context

// // AuthContext.jsx
// import React, { createContext, useState, useEffect, useContext } from "react";

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
// 	const [userToken, setUserToken] = useState(null);
// 	const [loading, setLoading] = useState(true); // auth initialization loading
// 	const [pageLoading, setPageLoading] = useState(false); // <-- NEW: track app/page data loading

// 	// Load token from localStorage on first mount
// 	useEffect(() => {
// 		const storedToken = localStorage.getItem("UserToken");
// 		if (storedToken) {
// 			setUserToken(storedToken);
// 		}
// 		setLoading(false); // done initializing
// 	}, []);

// 	// Sync changes to localStorage
// 	useEffect(() => {
// 		if (userToken) {
// 			localStorage.setItem("UserToken", userToken);
// 		} else {
// 			localStorage.removeItem("UserToken");
// 		}
// 	}, [userToken]);

// 	return (
// 		<AuthContext.Provider
// 			value={{
// 				userToken,
// 				setUserToken,
// 				loading, // auth loading
// 				pageLoading, // <-- new
// 				setPageLoading, // <-- new
// 			}}>
// 			{children}
// 		</AuthContext.Provider>
// 	);
// };

// // custom hook
// export const useAuth = () => useContext(AuthContext);

// !!! old user context
// import React, { createContext, useState, useEffect, useContext } from "react";

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
// 	const [userToken, setUserToken] = useState(null);
// 	const [loading, setLoading] = useState(true); //  new

// 	// Load token from localStorage on first mount
// 	useEffect(() => {
// 		const storedToken = localStorage.getItem("UserToken");
// 		if (storedToken) {
// 			setUserToken(storedToken);
// 		}
// 		setLoading(false); //  done initializing
// 	}, []);

// 	// Sync changes to localStorage
// 	useEffect(() => {
// 		if (userToken) {
// 			localStorage.setItem("UserToken", userToken);
// 		} else {
// 			localStorage.removeItem("UserToken");
// 		}
// 	}, [userToken]);

// 	return <AuthContext.Provider value={{ userToken, setUserToken, loading }}>{children}</AuthContext.Provider>;
// };

// // custom hook
// export const useAuth = () => useContext(AuthContext);
