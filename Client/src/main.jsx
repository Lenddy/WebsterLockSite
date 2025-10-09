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

import { AuthProvider } from "./context/AuthContext";

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

const userToken = localStorage.getItem("UserToken");

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

const allowedPermissionKeys = ["canEditUsers", "canDeleteUsers", "canChangeRole", "canViewUsers", "canViewAllUsers", "canEditSelf", "canViewSelf", "canDeleteSelf"];

//  Apollo Client instance
/**
 * Apollo Client instance configured with custom cache policies.
 *
 * - Uses `splitLink` for network transport.
 * - Implements a custom `InMemoryCache` with type policies for the `User` type.
 * - The `permissions` field merge function:
 *   - Retains existing permissions if no incoming permissions are provided.
 *   - Filters incoming permissions to only include allowed keys (defined in `allowedPermissionKeys`).
 *   - Merges filtered incoming permissions with existing ones.
 *
 * @constant
 * @type {ApolloClient}
 */

// const client = new ApolloClient({
// 	link: splitLink,
// 	cache: new InMemoryCache({
// 		typePolicies: {
// 			User: {
// 				fields: {
// 					permissions: {
// 						merge(existing = {}, incoming) {
// 							if (!incoming || Object.keys(incoming).length === 0) {
// 								return existing;
// 							}

// 							const filtered = Object.keys(incoming)
// 								.filter((key) => allowedPermissionKeys.includes(key))
// 								.reduce((obj, key) => {
// 									obj[key] = incoming[key];
// 									return obj;
// 								}, {});

// 							return {
// 								...existing,
// 								...filtered,
// 							};
// 						},
// 					},
// 				},
// 			},

// 			UserSnapshot: {
// 				keyFields: ["userId"], // this tells Apollo that userId uniquely identifies this object
// 			},
// 			MaterialRequest: {
// 				fields: {
// 					requester: {
// 						merge: true, // merge instead of replace
// 					},
// 				},
// 			},

// 			ItemGroup: {
// 				fields: {
// 					itemsList: {
// 						merge(existing = [], incoming, { mergeObjects }) {
// 							// Merge by index (default) OR by id if possible
// 							return incoming.map((item, index) => {
// 								return mergeObjects ? mergeObjects(existing[index], item) : item;
// 							});
// 						},
// 					},
// 				},
// 			},
// 		},
// 	}),
// });

//Apollo Client setup
const client = new ApolloClient({
	link: splitLink,
	cache: new InMemoryCache({
		typePolicies: {
			User: {
				fields: {
					permissions: {
						merge(existing = {}, incoming) {
							if (!incoming || Object.keys(incoming).length === 0) {
								return existing;
							}

							const filtered = Object.keys(incoming)
								.filter((key) => allowedPermissionKeys.includes(key))
								.reduce((obj, key) => {
									obj[key] = incoming[key];
									return obj;
								}, {});

							return {
								...existing,
								...filtered,
							};
						},
					},
				},
			},

			UserSnapshot: {
				keyFields: ["userId"],
			},

			//  UPDATED MaterialRequest type policy (important)
			MaterialRequest: {
				keyFields: ["id"], //  ensures all requests share the same cache entry
				fields: {
					requester: {
						merge: true, //  merge requester info instead of replacing
					},

					//  new: handle approvalStatus merge safely
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

					//  new: reviewers array — replace completely to avoid ghosts
					reviewers: {
						merge(existing = [], incoming) {
							return incoming ?? existing;
						},
					},

					//  new: merge items by ID for consistency
					items: {
						merge(existing = [], incoming) {
							const existingMap = new Map(existing.map((i) => [i.id, i]));
							incoming.forEach((item) => {
								existingMap.set(item.id, { ...existingMap.get(item.id), ...item });
							});
							return Array.from(existingMap.values());
						},
					},
				},
			},

			//  Keep your existing ItemGroup type policy
			ItemGroup: {
				fields: {
					itemsList: {
						merge(existing = [], incoming, { mergeObjects }) {
							return incoming.map((item, index) => {
								return mergeObjects ? mergeObjects(existing[index], item) : item;
							});
						},
					},
				},
			},
		},
	}),
});

//  Render app
createRoot(document.getElementById("root")).render(
	<ApolloProvider client={client}>
		<BrowserRouter>
			<StrictMode>
				<AuthProvider AuthProvider>
					<App />
				</AuthProvider>
			</StrictMode>
		</BrowserRouter>
	</ApolloProvider>
);
