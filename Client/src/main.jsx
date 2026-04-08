import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";

import { ApolloProvider } from "@apollo/client";
import ApolloWrapper from "./context/ApolloWrapper.jsx";
// import client from "../graphQL/apolloClient.js"; // imported client
// import client from "../src/context/apolloClient.js"; // imported client

import { AuthProvider } from "./context/AuthContext";
import { UsersProvider } from "./context/UsersContext";
import { ItemGroupsProvider } from "./context/ItemGroupContext";
import { MaterialRequestsProvider } from "./context/MaterialRequestContext.jsx";
import "../i18n.js";
import i18n from "../i18n";
import AuthSubscriptionBridge from "./context/AuthSubscriptionBridge.jsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { registerSW } from "virtual:pwa-register";

console.log("waiting for update");

// const updateSW = registerSW({
// 	onNeedRefresh() {
// 		console.log("New version available → forcing update...");

// 		updateSW(true);
// 	},
// 	onOfflineReady() {
// 		console.log("App ready for offline use");
// 	},
// });

const updateSW = registerSW({
	onNeedRefresh() {
		toast.info(
			({ closeToast }) => (
				<div>
					<p>
						{i18n.t("new-version-available")}
						<br />
						{i18n.t("please-refresh-to-update")}
					</p>

					<button
						onClick={() => {
							closeToast();
							updateSW(true);
						}}
						style={{ marginTop: "8px" }}>
						Refresh
					</button>
				</div>
			),
			{
				autoClose: false,
				closeOnClick: false,
				draggable: false,
			}
		);
	},

	onOfflineReady() {
		console.log("App ready for offline use");
	},
});

const isBrave = (navigator.brave && navigator.brave.isBrave()) || false;
if (isBrave) {
	//REVIEW use translations
	toast("Brave browser detected. Please disable Shields by clicking the lion icon  and reload the page or you wont be able to get live data (latest data automatically) .", {
		position: "top-left",
		autoClose: false,
		// hideProgressBar: false,
		closeOnClick: true,
		pauseOnHover: true,
		draggable: true,
		progress: undefined,
		// theme: "light",
		// transition: Bounce,
	});
}

{
	/* your routes / layout */
}

//  Render app
createRoot(document.getElementById("root")).render(
	// <ApolloProvider client={client}>
	<AuthProvider>
		<ToastContainer position="top-left" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable pauseOnFocusLoss />
		<BrowserRouter>
			<ApolloWrapper>
				<AuthSubscriptionBridge />
				{/* <StrictMode> */}
				<UsersProvider>
					<ItemGroupsProvider>
						<MaterialRequestsProvider>
							<App />
							{/* client={client} */}
						</MaterialRequestsProvider>
					</ItemGroupsProvider>
				</UsersProvider>
				{/* </StrictMode> */}
			</ApolloWrapper>
		</BrowserRouter>
	</AuthProvider>
	// </ApolloProvider>
);
