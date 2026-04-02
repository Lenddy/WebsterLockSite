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
	// Destructure auth context values
	const { userToken, setUserToken, setWsDisconnected } = useAuth();

	// Extract user ID from JWT token
	const currentUserId = userToken ? jwtDecode(userToken).userId : null;

	// Get translation function for i18n
	const { t } = useTranslation();

	// Get Apollo Client instance for disposal if needed
	const client = useApolloClientInstance();

	// Get current location and navigation function
	const location = useLocation();
	const navigate = useNavigate();

	// Subscribe to user change events from server
	useSubscription(USER_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData }) => {
			// Extract the change event from subscription data
			const changeEvent = subscriptionData?.data?.onUserChange;
			if (!changeEvent) return;

			// Destructure event details
			const { eventType, changeType, change, changes, updateBy } = changeEvent;

			// Normalize changes into an array for consistent iteration
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			if (!changesArray.length) return;

			// Process each changed user
			for (const updatedUser of changesArray) {
				const updatedUserId = updatedUser?.id;

				// Only handle changes for the currently logged-in user
				if (!currentUserId || updatedUserId !== currentUserId) continue;

				// If user was updated → refresh the auth token
				if (eventType === "updated") {
					const newToken = updatedUser?.token;

					if (newToken) {
						// Update token in context and storage
						setUserToken(newToken);
						localStorage.setItem("token", newToken);

						// Notify user if updated by someone else
						if (updateBy !== currentUserId) {
							alert(t("user-profile-has-been-updated"));
						}
					}
				}

				// If user was deleted → force logout
				if (eventType === "deleted") {
					alert(t("your-account-has-been-deleted"));

					// Clear token from context and storage
					setUserToken(null);
					sessionStorage.removeItem("token");
					localStorage.clear();

					// Dispose WebSocket connection
					try {
						client?.dispose?.();
					} catch (e) {
						console.warn("WS dispose error:", e);
					}

					// Redirect to login page
					window.location.href = "/login";
					return;
				}
			}
		},

		// Handle subscription errors
		onError: (err) => {
			// Flag WebSocket as disconnected if connection was lost
			if (err?.message?.includes("Socket closed") || err?.networkError) {
				setWsDisconnected(true);
			}
		},
	});

	return null; // invisible bridge
}
