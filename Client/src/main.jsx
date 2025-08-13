import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";

import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";

// 1 Error handling link
/**
 * Apollo Link error handler for logging GraphQL and network errors.
 *
 * This link intercepts errors from GraphQL operations and logs detailed error messages
 * to the console. It handles both GraphQL errors (such as validation or resolver errors)
 * and network errors (such as connectivity issues).
 *
 * @constant
 * @type {import('@apollo/client').ApolloLink}
 */

const errorLink = onError(({ graphQLErrors, networkError }) => {
	if (graphQLErrors) {
		graphQLErrors.forEach(({ message }) => {
			console.error(`GraphQL error: ${message}`);
		});
	}
	if (networkError) {
		console.error(`Network error: ${networkError}`);
	}
});

//  HTTP link (for queries & mutations)
const httpLink = new HttpLink({
	uri: import.meta.env.VITE_API_URL, // Your backend GraphQL endpoint
});

const authLink = setContext((_, { headers }) => {
	const token = localStorage.getItem("UserToken"); // Always read latest
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${token}` : "",
		},
	};
});

//  WebSocket link (for subscriptions)
const wsLink = new GraphQLWsLink(
	createClient({
		url: import.meta.env.VITE_WS_URL, // IMPORTANT: ws:// for dev, wss:// for prod
		connectionParams: {
			// You can send auth headers here if needed
			authorization: localStorage.getItem("UserToken") ? `Bearer ${localStorage.getItem("UserToken")}` : "",
		},
	})
);

//  Split based on operation type (subscription vs query/mutation)
const splitLink = split(
	({ query }) => {
		const definition = getMainDefinition(query);
		return definition.kind === "OperationDefinition" && definition.operation === "subscription";
	},
	wsLink,
	errorLink.concat(authLink.concat(httpLink)) //  add auth before http
);

//  Apollo Client instance
const client = new ApolloClient({
	link: splitLink,
	cache: new InMemoryCache(),
});

//  Render app
createRoot(document.getElementById("root")).render(
	<ApolloProvider client={client}>
		<BrowserRouter>
			<StrictMode>
				<App />
			</StrictMode>
		</BrowserRouter>
	</ApolloProvider>
);
