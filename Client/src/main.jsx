import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";

import { ApolloProvider } from "@apollo/client";
import client from "../graphQL/apolloClient.js"; // imported client
import { AuthProvider } from "./context/AuthContext";

//  Render app
createRoot(document.getElementById("root")).render(
	<ApolloProvider client={client}>
		<BrowserRouter>
			<StrictMode>
				<AuthProvider AuthProvider>
					<App client={client} />
				</AuthProvider>
			</StrictMode>
		</BrowserRouter>
	</ApolloProvider>
);
