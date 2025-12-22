import { useSubscription } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import { USER_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions";
import { useAuth } from "./AuthContext";

export default function AuthSubscriptionBridge() {
	const { userToken, setUserToken } = useAuth();

	const currentUserId = userToken ? jwtDecode(userToken).userId : null;

	// useSubscription(USER_CHANGE_SUBSCRIPTION, {
	// 	onData: ({ data }) => {
	// 		const payload = data?.data?.onUserChange;
	// 		if (!payload) return;

	// 		const { eventType, changes, updateBy } = payload;
	// 		if (eventType !== "updated") return;

	// 		for (const updatedUser of changes || []) {
	// 			if (updatedUser.id === currentUserId && updatedUser.token) {
	// 				console.log("🔑 Token refreshed via subscription");
	// 				setUserToken(updatedUser.token);

	// 				if (updateBy !== currentUserId) {
	// 					alert("Your profile was updated. Session refreshed.");
	// 				}
	// 			}
	// 		}
	// 	},
	// });

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

				// if (currentUserId && updatedUserId === currentUserId && newToken) {
				// 	setUserToken(newToken);

				// 	// 🔥 Force WebSocket reconnection
				// 	try {
				// 		// wsLink.client?.dispose();
				// 		wsClient.dispose();
				// 	} catch (e) {
				// 		console.warn("WS reconnect error:", e);
				// 	}
				// }
			}
		},

		onError: (err) => {
			console.error("🚨 [AuthContext] Subscription error:", err);
		},
	});

	return null; // invisible bridge
}
