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

//  Render app
createRoot(document.getElementById("root")).render(
	// <ApolloProvider client={client}>
	<AuthProvider>
		<BrowserRouter>
			<ApolloWrapper>
				<StrictMode>
					<UsersProvider>
						<ItemGroupsProvider>
							<MaterialRequestsProvider>
								<App />
								{/* client={client} */}
							</MaterialRequestsProvider>
						</ItemGroupsProvider>
					</UsersProvider>
				</StrictMode>
			</ApolloWrapper>
		</BrowserRouter>
	</AuthProvider>
	// </ApolloProvider>
);
