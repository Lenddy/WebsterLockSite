import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
// import {  useAuth } from "../src/context/AuthContext";
console.log("started apollo Client at", new Date());
const token = localStorage.getItem("userToken");
// const token = localStorage.getItem("UserToken");
const allowedPermissionKeys = ["canEditUsers", "canDeleteUsers", "canChangeRole", "canViewUsers", "canViewAllUsers", "canEditSelf", "canViewSelf", "canDeleteSelf"];

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

// --- HTTP link (queries & mutations)
const httpLink = new HttpLink({
	uri: import.meta.env.VITE_API_URL,
});

// --- Auth link (adds token)
// const authLink = setContext((_, { headers }) => {
// 	// const token = localStorage.getItem("UserToken");
// 	return {
// 		headers: {
// 			...headers,
// 			authorization: localStorage.getItem("UserToken") ? `Bearer ${localStorage.getItem("UserToken")}` : "",
// 			// authorization: token ? `Bearer ${token}` : "",
// 		},
// 	};
// });

const authLink = setContext((_, { headers }) => {
	// const token = localStorage.getItem("UserToken"); // fresh every request
	// console.log("token in  apollo client", token);
	console.log("setting token ad context", new Date(), "\n", token);
	return {
		headers: {
			...headers,
			Authorization: token ? `Bearer ${token}` : "",
		},
	};
});

// --- WebSocket link (subscriptions)
const wsLink = new GraphQLWsLink(
	createClient({
		url: import.meta.env.VITE_WS_URL,
		connectionParams: {
			// authorization: localStorage.getItem("UserToken") ? `Bearer ${localStorage.getItem("UserToken")}` : "",
			authorization: token ? `Bearer ${token}` : "",
		},
		// connectionParams: () => {
		// 	const token = localStorage.getItem("userToken"); // fresh every request
		// 	return {
		// 		authorization: token ? `Bearer ${token}` : "",
		// 	};
		// },
	})
);

// --- Error handling link
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

// --- Split between HTTP and WS
const splitLink = split(
	({ query }) => {
		const definition = getMainDefinition(query);
		return definition.kind === "OperationDefinition" && definition.operation === "subscription";
	},
	wsLink,
	errorLink.concat(authLink.concat(httpLink))
);

// --- Cache setup
const client = new ApolloClient({
	link: splitLink,
	cache: new InMemoryCache({
		typePolicies: {
			User: {
				fields: {
					permissions: {
						merge(existing = {}, incoming) {
							if (!incoming || Object.keys(incoming).length === 0) return existing;
							const filtered = Object.keys(incoming)
								.filter((key) => allowedPermissionKeys.includes(key))
								.reduce((obj, key) => {
									obj[key] = incoming[key];
									return obj;
								}, {});
							return { ...existing, ...filtered };
						},
					},
				},
			},

			UserSnapshot: { keyFields: ["userId"] },

			MaterialRequest: {
				keyFields: ["id"],

				fields: {
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

					items: {
						merge(existing = [], incoming, { readField }) {
							// If no incoming data, keep existing
							if (!incoming || incoming.length === 0) return existing;

							const mergedMap = new Map();

							// 1️ Start by adding all existing items
							for (const item of existing) {
								const id = readField("id", item) || item.id;
								if (id) mergedMap.set(id, item);
							}

							// 2️ Merge or add incoming items
							for (const item of incoming) {
								const id = readField("id", item) || item.id;
								if (!id) continue; // skip items without IDs
								mergedMap.set(id, { ...mergedMap.get(id), ...item });
							}

							// 3️ Remove any items not present in the incoming list
							const incomingIds = new Set(incoming.map((item) => readField("id", item) || item.id));
							for (const id of mergedMap.keys()) {
								if (!incomingIds.has(id)) mergedMap.delete(id);
							}

							// 4️ Return merged array (preserves order from incoming)
							return incoming.map((item) => mergedMap.get(readField("id", item) || item.id));
						},
					},
				},
			},

			MaterialRequestItem: { keyFields: ["id"] },

			ApprovalStatus: {
				keyFields: false, // these are small embedded objects, not standalone entities
			},
			ApprovedBy: {
				keyFields: false,
			},

			ItemGroup: {
				fields: {
					itemsList: {
						merge(existing = [], incoming, { mergeObjects }) {
							return incoming.map((item, index) => (mergeObjects ? mergeObjects(existing[index], item) : item));
						},
					},
				},
			},
		},
	}),
});

export default client;

// !!!!!!!!   old

// import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
// import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
// import { createClient } from "graphql-ws";
// import { getMainDefinition } from "@apollo/client/utilities";
// import { onError } from "@apollo/client/link/error";
// import { setContext } from "@apollo/client/link/context";

// const allowedPermissionKeys = ["canEditUsers", "canDeleteUsers", "canChangeRole", "canViewUsers", "canViewAllUsers", "canEditSelf", "canViewSelf", "canDeleteSelf"];

// // --- Error handling link
// const errorLink = onError(({ graphQLErrors, networkError }) => {
// 	if (graphQLErrors) {
// 		graphQLErrors.forEach(({ message }) => {
// 			console.error(`GraphQL error: ${message}`);
// 		});
// 	}
// 	if (networkError) {
// 		console.error(`Network error: ${networkError}`);
// 	}
// });

// // --- HTTP link (queries & mutations)
// const httpLink = new HttpLink({
// 	uri: import.meta.env.VITE_API_URL,
// });

// // --- Auth link (adds token for HTTP requests)
// const authLink = setContext((_, { headers }) => {
// 	const token = localStorage.getItem("UserToken");
// 	return {
// 		headers: {
// 			...headers,
// 			authorization: token ? `Bearer ${token}` : "",
// 		},
// 	};
// });

// // --- Dynamic WebSocket client (Option 1 FIX 🚀)
// const wsClient = createClient({
// 	url: import.meta.env.VITE_WS_URL,

// 	// 🔥 ALWAYS fetch the latest token
// 	connectionParams: () => {
// 		const token = localStorage.getItem("UserToken");
// 		return {
// 			authorization: token ? `Bearer ${token}` : "",
// 		};
// 	},
// });

// // --- WebSocket link (subscriptions)
// const wsLink = new GraphQLWsLink(wsClient);

// // --- Split: subscriptions → WS / others → HTTP
// const splitLink = split(
// 	({ query }) => {
// 		const definition = getMainDefinition(query);
// 		return definition.kind === "OperationDefinition" && definition.operation === "subscription";
// 	},
// 	wsLink,
// 	errorLink.concat(authLink.concat(httpLink))
// );

// // --- Cache setup
// const client = new ApolloClient({
// 	link: splitLink,
// 	cache: new InMemoryCache({
// 		typePolicies: {
// 			User: {
// 				fields: {
// 					permissions: {
// 						merge(existing = {}, incoming) {
// 							if (!incoming || Object.keys(incoming).length === 0) return existing;
// 							const filtered = Object.keys(incoming)
// 								.filter((key) => allowedPermissionKeys.includes(key))
// 								.reduce((obj, key) => {
// 									obj[key] = incoming[key];
// 									return obj;
// 								}, {});
// 							return { ...existing, ...filtered };
// 						},
// 					},
// 				},
// 			},

// 			UserSnapshot: { keyFields: ["userId"] },

// 			MaterialRequest: {
// 				keyFields: ["id"],
// 				fields: {
// 					approvalStatus: {
// 						merge(existing = {}, incoming) {
// 							return {
// 								...existing,
// 								...incoming,
// 								approvedBy: {
// 									...existing?.approvedBy,
// 									...incoming?.approvedBy,
// 								},
// 							};
// 						},
// 					},

// 					items: {
// 						merge(existing = [], incoming, { readField }) {
// 							if (!incoming || incoming.length === 0) return existing;

// 							const mergedMap = new Map();

// 							// Add existing items
// 							for (const item of existing) {
// 								const id = readField("id", item) || item.id;
// 								if (id) mergedMap.set(id, item);
// 							}

// 							// Merge incoming items
// 							for (const item of incoming) {
// 								const id = readField("id", item) || item.id;
// 								if (!id) continue;
// 								mergedMap.set(id, { ...mergedMap.get(id), ...item });
// 							}

// 							// Remove deleted items
// 							const incomingIds = new Set(incoming.map((item) => readField("id", item) || item.id));
// 							for (const id of mergedMap.keys()) {
// 								if (!incomingIds.has(id)) mergedMap.delete(id);
// 							}

// 							// Preserve incoming order
// 							return incoming.map((item) => mergedMap.get(readField("id", item) || item.id));
// 						},
// 					},
// 				},
// 			},

// 			MaterialRequestItem: { keyFields: ["id"] },

// 			ApprovalStatus: { keyFields: false },
// 			ApprovedBy: { keyFields: false },

// 			ItemGroup: {
// 				fields: {
// 					itemsList: {
// 						merge(existing = [], incoming, { mergeObjects }) {
// 							return incoming.map((item, index) => (mergeObjects ? mergeObjects(existing[index], item) : item));
// 						},
// 					},
// 				},
// 			},
// 		},
// 	}),
// });

// export default client;
// export { wsClient }; // optional: exported only if needed elsewhere

// const client = new ApolloClient({
// 	link: splitLink,
// 	cache: new InMemoryCache({
// 		typePolicies: {
// 			Query: {
// 				fields: {
// 					getAllMaterialRequests: {
// 						keyArgs: false, // treats all requests as part of the same list
// 						merge(existing = [], incoming = [], { readField }) {
// 							// Convert to map by ID to avoid duplicates
// 							const merged = [...existing];

// 							for (const item of incoming) {
// 								const id = readField("id", item);
// 								const existingIndex = merged.findIndex((ref) => readField("id", ref) === id);

// 								if (existingIndex > -1) {
// 									// Update existing
// 									merged[existingIndex] = item;
// 								} else {
// 									// Append new
// 									merged.push(item);
// 								}
// 							}

// 							return merged;
// 						},
// 					},
// 				},
// 			},

// 			MaterialRequest: {
// 				keyFields: ["id"],
// 				fields: {
// 					approvalStatus: {
// 						merge(existing = {}, incoming) {
// 							return {
// 								...existing,
// 								...incoming,
// 								approvedBy: {
// 									...existing?.approvedBy,
// 									...incoming?.approvedBy,
// 								},
// 							};
// 						},
// 					},
// 					items: {
// 						merge(existing = [], incoming = [], { readField }) {
// 							const mergedMap = new Map();

// 							for (const item of existing) {
// 								const id = readField("id", item) || item.id;
// 								if (id) mergedMap.set(id, item);
// 							}

// 							for (const item of incoming) {
// 								const id = readField("id", item) || item.id;
// 								if (id) mergedMap.set(id, { ...mergedMap.get(id), ...item });
// 							}

// 							const incomingIds = new Set(incoming.map((i) => readField("id", i) || i.id));
// 							for (const id of mergedMap.keys()) {
// 								if (!incomingIds.has(id)) mergedMap.delete(id);
// 							}

// 							return Array.from(mergedMap.values());
// 						},
// 					},
// 				},
// 			},

// 			MaterialRequestItem: { keyFields: ["id"] },
// 		},
// 	}),
// });

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
// console.log("this is the client / caches from the apollo client before cleaning", client.cache.extract());
// client.resetStore();
// console.log("this is the client / caches from the apollo client after cleaning", client.cache.extract());
// export default client;
