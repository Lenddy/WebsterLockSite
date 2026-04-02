import { createContext, useContext, useMemo } from "react";
import { ApolloProvider, ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
import { useAuth } from "../context/AuthContext";

export const ApolloClientContext = createContext(null);
export const useApolloClientInstance = () => useContext(ApolloClientContext);

export default function ApolloWrapper({ children }) {
	const { userToken, pageLoading, loading } = useAuth();

	const client = useMemo(() => {
		// ---- AUTH LINK ----
		// Sets up authentication by adding the JWT token to request headers
		const authLink = setContext((_, { headers }) => ({
			headers: {
				...headers,
				Authorization: userToken ? `Bearer ${userToken}` : "",
			},
		}));

		// ---- HTTP LINK ----
		// Configures the HTTP link for regular GraphQL queries and mutations
		const httpLink = new HttpLink({
			uri: import.meta.env.VITE_API_URL,
		});

		// ---- WS LINK (SUBSCRIPTIONS) ----
		// Configures the WebSocket link for GraphQL subscriptions (real-time updates)
		const wsLink = new GraphQLWsLink(
			createClient({
				url: import.meta.env.VITE_WS_URL,
				// Passes the JWT token in WebSocket connection params for authentication
				connectionParams: () => ({
					authorization: userToken ? `Bearer ${userToken}` : "",
				}),
			})
		);

		// ---- ERROR LINK ----
		// Handles and logs GraphQL and network errors
		const errorLink = onError(({ graphQLErrors, networkError }) => {
			if (graphQLErrors) {
				graphQLErrors.forEach(({ message }) => {
					console.error(`[GraphQL error]: ${message}`);
				});
			}
			if (networkError) {
				console.error(`[Network error]: ${networkError}`);
			}
		});

		// ---- SPLIT LINK (HTTP vs WS) ----
		// Routes requests: subscriptions use WebSocket, queries/mutations use HTTP with auth and error handling
		const splitLink = split(
			({ query }) => {
				// Define which operation is a subscription
				const def = getMainDefinition(query);
				return def.kind === "OperationDefinition" && def.operation === "subscription";
			},
			wsLink, // Use WebSocket for subscriptions
			errorLink.concat(authLink.concat(httpLink)) // Use HTTP with error and auth handling for queries/mutations
		);

		// ---- FINAL CLIENT ----
		// Creates the Apollo Client with the configured links and cache
		return new ApolloClient({
			link: splitLink,
			// Configure cache with custom merge strategies for specific types
			cache: new InMemoryCache({
				typePolicies: {
					// UserSnapshot: Uses userId as the unique identifier
					UserSnapshot: { keyFields: ["userId"] },

					// MaterialRequest: Custom merge strategies for nested data
					MaterialRequest: {
						keyFields: ["id"],
						fields: {
							// Merge approval status objects, combining existing and new data
							approvalStatus: {
								merge(existing = {}, incoming) {
									return {
										...existing,
										...incoming,
										approvedBy: {
											...existing?.approvedBy,
											...incoming?.approvedBy,
										},
									};
								},
							},
							// Merge items array: updates existing items and removes deleted ones
							items: {
								merge(existing = [], incoming = [], { readField }) {
									// If no incoming data, keep existing
									if (!incoming || incoming.length === 0) return existing;

									// Create map of existing items by id
									const map = new Map();
									existing.forEach((item) => {
										const id = readField("id", item) || item.id;
										if (id) map.set(id, item);
									});

									// Merge incoming items into map
									incoming.forEach((item) => {
										const id = readField("id", item) || item.id;
										if (id) map.set(id, { ...map.get(id), ...item });
									});

									// Remove items not in incoming (deleted items)
									const incomingIds = new Set(incoming.map((item) => readField("id", item) || item.id));
									for (const id of map.keys()) {
										if (!incomingIds.has(id)) map.delete(id);
									}

									// Return merged items in incoming order
									return incoming.map((item) => {
										const id = readField("id", item) || item.id;
										return map.get(id);
									});
								},
							},
						},
					},

					// MaterialRequestItem: Uses id as the unique identifier
					MaterialRequestItem: { keyFields: ["id"] },

					// ItemGroup: Merges itemsList arrays with custom merge logic
					ItemGroup: {
						fields: {
							itemsList: {
								merge(existing = [], incoming, { mergeObjects }) {
									// Merge each incoming item with corresponding existing item
									return incoming.map((item, index) => (mergeObjects ? mergeObjects(existing[index], item) : item));
								},
							},
						},
					},
				},
			}),
		});
	}, [userToken]); // Re-create client when userToken changes

	return (
		<ApolloClientContext.Provider value={client}>
			<ApolloProvider client={client}>{children}</ApolloProvider>
		</ApolloClientContext.Provider>
	);
}
