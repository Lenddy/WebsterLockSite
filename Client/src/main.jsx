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

// 1 Error handling link
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
	uri: "http://localhost:8080/graphql", // Your backend GraphQL endpoint
});

//  WebSocket link (for subscriptions)
const wsLink = new GraphQLWsLink(
	createClient({
		url: "ws://localhost:8080/graphql", // IMPORTANT: ws:// for dev, wss:// for prod
		connectionParams: {
			// You can send auth headers here if needed
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
	errorLink.concat(httpLink) // HTTP gets errors handled
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
