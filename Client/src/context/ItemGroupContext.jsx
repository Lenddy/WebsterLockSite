import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_item_groups } from "../../graphQL/queries/queries";
import { ITEM_GROUP_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions";
import { useAuth } from "./AuthContext";
import { jwtDecode } from "jwt-decode";
import { can } from "../component/utilities/can";

const ItemGroupsContext = createContext();

/**
 * ItemGroupsProvider Component
 * 
 * A context provider that manages item groups data with real-time synchronization.
 * Handles authentication, data fetching, and subscription-based updates.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with the provider
 * 
 * @returns {JSX.Element} Provider component wrapping children with ItemGroupsContext
 * 
 * @description
 * This provider:
 * - Waits for user authentication before fetching data
 * - Fetches all item groups via GraphQL query with cache-and-network strategy
 * - Maintains real-time synchronization via WebSocket subscription
 * - Handles CRUD operations (create, update, delete) on item groups
 * - Keeps local state and Apollo cache in sync
 * - Sorts item groups alphabetically by brand name
 * - Detects WebSocket disconnections and notifies parent context
 * 
 * @context ItemGroupsContext
 * @contextValue {Object} value
 * @contextValue {Array<Object>} value.items - Sorted array of item group objects
 * @contextValue {boolean} value.loading - Loading state (auth or query loading)
 * @contextValue {Error|null} value.error - GraphQL query error if any
 * 
 * @example
 * // Usage in app
 * <ItemGroupsProvider>
 *   <YourComponent />
 * </ItemGroupsProvider>
 */
export function ItemGroupsProvider({ children }) {

	const { loading: authLoading, userToken, setWsDisconnected } = useAuth(); // wait for token
	const [items, setItems] = useState([]);

	const canReview = () => {
		if (!userToken) return false;

		const token = jwtDecode(userToken);

		// Extract role safely whether it's: "admin" OR { role: "admin" }
		const role = typeof token?.role === "string" ? token.role : token?.role?.role;

		return ["headAdmin", "admin", "subAdmin", "user"].includes(role) && can(token, "items:read:any");
	};

	const {
		data,
		loading: queryLoading,
		error,
	} = useQuery(get_all_item_groups, {
		skip: authLoading || !userToken || !canReview(),
		// fetchPolicy: "cache-first",
		fetchPolicy: "cache-and-network",
	});

	// Initial load
	useEffect(() => {
		if (data?.getAllItemGroups) {
			const sorted = sortByBrand(data.getAllItemGroups);
			setItems(sorted);
		}
	}, [data]);

	// Helper to sort by brand
	const sortByBrand = (list) => [...list].sort((a, b) => (a.brand || "").toLowerCase().localeCompare((b.brand || "").toLowerCase()));

	// Subscription
	useSubscription(ITEM_GROUP_CHANGE_SUBSCRIPTION, {
		skip: authLoading || !userToken || !canReview(),
		onData: ({ data: subscriptionData, client }) => {
			console.log("Subscription raw data:", subscriptionData);
			const changeEvent = subscriptionData?.data?.onItemGroupChange;
			if (!changeEvent) return;

			const { eventType, changeType, change, changes } = changeEvent;
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];
			if (!changesArray.length) return;

			setItems((prev) => {
				let updated = [...prev];
				for (const item of changesArray) {
					if (eventType === "created") {
						if (!prev.some((ig) => ig.id === item.id)) updated.push(item);
					} else if (eventType === "updated") {
						updated = updated.map((ig) => (ig.id === item.id ? { ...ig, ...item } : ig));
					} else if (eventType === "deleted") {
						updated = updated.filter((ig) => ig.id !== item.id);
					}
				}
				return sortByBrand(updated);
			});

			// Optional: update Apollo cache
			try {
				client.cache.modify({
					fields: {
						getAllItemGroups(existingRefs = [], { readField }) {
							let newRefs = [...existingRefs];
							for (const item of changesArray) {
								if (eventType === "deleted") {
									newRefs = newRefs.filter((ref) => readField("id", ref) !== item.id);
									continue;
								}
								const idx = newRefs.findIndex((ref) => readField("id", ref) === item.id);
								if (idx > -1 && eventType === "updated") {
									newRefs[idx] = client.cache.writeFragment({
										data: item,
										fragment: gql`
											fragment UpdatedItemGroup on ItemGroup {
												id
												brand
												itemsList {
													id
													itemName
													# itemDescription
												}
											}
										`,
									});
								} else if (eventType === "created") {
									const newRef = client.cache.writeFragment({
										data: item,
										fragment: gql`
											fragment NewItemGroup on ItemGroup {
												id
												brand
												itemsList {
													id
													itemName
													# itemDescription
												}
											}
										`,
									});
									newRefs.push(newRef);
								}
							}
							return newRefs;
						},
					},
				});
			} catch (err) {
				console.warn(" Cache update skipped:", err.message);
			}
		},
		onError: (err) => {
			// console.error("Subscription error:", err);
			if (err?.message?.includes("Socket closed") || err?.networkError) {
				setWsDisconnected(true);
			}
		},
	});

	return <ItemGroupsContext.Provider value={{ items, loading: queryLoading || authLoading, error }}>{children}</ItemGroupsContext.Provider>;
}

export function useItemGroups() {
	return useContext(ItemGroupsContext);
}
