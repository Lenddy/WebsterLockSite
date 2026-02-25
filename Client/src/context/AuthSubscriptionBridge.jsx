import { useEffect } from "react";
import { useSubscription } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { USER_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useApolloClientInstance } from "../context/ApolloWrapper";
import { useLocation, useNavigate } from "react-router-dom";

export default function AuthSubscriptionBridge() {
	const { userToken, setUserToken, setWsDisconnected } = useAuth();

	const currentUserId = userToken ? jwtDecode(userToken).userId : null;
	const { t } = useTranslation();

	const client = useApolloClientInstance();

	const location = useLocation();
	const navigate = useNavigate();

	// useEffect(() => {
	//   if (!currentUser) return;

	//   const hasAccess = checkRouteAccess(location.pathname, currentUser.permissions);

	//   if (!hasAccess) {
	//     navigate("/unauthorized", { replace: true });
	//   }
	// }, [location.pathname, currentUser]);

	// Listen for USER_CHANGE_SUBSCRIPTION (same event you use everywhere else)
	useSubscription(USER_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			// console.log(" [AuthContext] Subscription data:", subscriptionData);

			const changeEvent = subscriptionData?.data?.onUserChange;
			if (!changeEvent) return;

			const { eventType, changeType, change, changes, updateBy } = changeEvent;

			// Normalize into array for consistency
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			if (!changesArray.length) return;

			// for (const updatedUser of changesArray) {
			// 	if (eventType !== "updated") continue; // only handle updates

			// 	const newToken = updatedUser?.token;
			// 	const updatedUserId = updatedUser?.id;

			// 	//  Only update if the changed user is the logged-in one
			// 	if (currentUserId && updatedUserId === currentUserId && newToken) {
			// 		// console.log(" [AuthContext] Token updated via PubSub — refreshing context...");
			// 		setUserToken(newToken);
			// 		// console.log("updateBy", updateBy);
			// 		if (updateBy !== currentUserId) {
			// 			// toast.update("User profile has been updated (from the context)");
			// 			alert(t("user-profile-has-been-updated"));
			// 		}

			// 		// Optional: toast or banner
			// 		// showToast("Your session was refreshed after profile update");
			// 	}

			// 	// if (currentUserId && updatedUserId === currentUserId && newToken) {
			// 	// 	setUserToken(newToken);

			// 	// 	//  Force WebSocket reconnection
			// 	// 	try {
			// 	// 		// wsLink.client?.dispose();
			// 	// 		wsClient.dispose();
			// 	// 	} catch (e) {
			// 	// 		console.warn("WS reconnect error:", e);
			// 	// 	}
			// 	// }
			// }
			for (const updatedUser of changesArray) {
				const updatedUserId = updatedUser?.id;

				// Only care about current logged-in user
				if (!currentUserId || updatedUserId !== currentUserId) continue;

				// If user was updated → refresh token
				if (eventType === "updated") {
					const newToken = updatedUser?.token;

					if (newToken) {
						setUserToken(newToken);
						localStorage.setItem("token", newToken);

						if (updateBy !== currentUserId) {
							alert(t("user-profile-has-been-updated"));
						}
					}
				}

				// If user was deleted → FORCE LOGOUT
				if (eventType === "deleted") {
					alert(t("your-account-has-been-deleted"));

					// Clear React state
					setUserToken(null);

					// Remove token from browser
					// localStorage.removeItem("token");
					sessionStorage.removeItem("token");

					//clear everything in local storage
					localStorage.clear();

					// disconnect websocket
					try {
						client?.dispose?.();
					} catch (e) {
						console.warn("WS dispose error:", e);
					}

					// Redirect to login
					window.location.href = "/login";

					return;
				}
			}
		},

		onError: (err) => {
			// console.error("Subscription error:", err);
			if (err?.message?.includes("Socket closed") || err?.networkError) {
				setWsDisconnected(true);
			}
		},
	});

	return null; // invisible bridge
}
