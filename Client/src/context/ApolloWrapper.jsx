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
	// console.log("loading ?", loading);

	// Wait for userToken before creating client
	// if (loading) {
	// 	console.log("from apolloProvider");
	// 	console.log("loading userToken at ", new Date(), "\n", loading);
	// 	return <div>Loading...</div>;
	// }

	// if(

	//     userToken && !loading
	// )

	const client = useMemo(() => {
		// console.log("🚀 Creating Apollo Client with userToken at :", new Date(), "\n", userToken);

		// ---- AUTH LINK ----
		const authLink = setContext((_, { headers }) => ({
			headers: {
				...headers,
				Authorization: userToken ? `Bearer ${userToken}` : "",
			},
		}));

		// ---- HTTP LINK ----
		const httpLink = new HttpLink({
			uri: import.meta.env.VITE_API_URL,
		});

		// ---- WS LINK (SUBSCRIPTIONS) ----
		const wsLink = new GraphQLWsLink(
			createClient({
				url: import.meta.env.VITE_WS_URL,
				connectionParams: () => ({
					authorization: userToken ? `Bearer ${userToken}` : "",
				}),
			})
		);

		// ---- ERROR LINK ----
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
		const splitLink = split(
			({ query }) => {
				const def = getMainDefinition(query);
				return def.kind === "OperationDefinition" && def.operation === "subscription";
			},
			wsLink,
			errorLink.concat(authLink.concat(httpLink))
		);

		// ---- FINAL CLIENT ----
		return new ApolloClient({
			link: splitLink,
			cache: new InMemoryCache({
				typePolicies: {
					//
					// User: {
					// 	fields: {
					// 		permissions: {
					// 			merge: false,
					// 		},
					// 	},
					// },

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
								merge(existing = [], incoming = [], { readField }) {
									// If no incoming data, keep existing
									if (!incoming || incoming.length === 0) return existing;

									const map = new Map();

									existing.forEach((item) => {
										const id = readField("id", item) || item.id;
										if (id) map.set(id, item);
									});

									incoming.forEach((item) => {
										const id = readField("id", item) || item.id;
										if (id) map.set(id, { ...map.get(id), ...item });
									});

									const incomingIds = new Set(incoming.map((item) => readField("id", item) || item.id));
									for (const id of map.keys()) {
										if (!incomingIds.has(id)) map.delete(id);
									}

									return incoming.map((item) => {
										const id = readField("id", item) || item.id;
										return map.get(id);
									});
								},
							},
						},
					},

					MaterialRequestItem: { keyFields: ["id"] },

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
	}, [userToken]);

	return (
		<ApolloClientContext.Provider value={client}>
			<ApolloProvider client={client}>{children}</ApolloProvider>
		</ApolloClientContext.Provider>
	);
}
