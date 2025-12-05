import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_item_groups } from "../../graphQL/queries/queries";
import { ITEM_GROUP_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions";
import { useAuth } from "./AuthContext";

const ItemGroupsContext = createContext();

export function ItemGroupsProvider({ children }) {
	const { loading: authLoading, userToken } = useAuth(); // wait for token
	const [items, setItems] = useState([]);

	const {
		data,
		loading: queryLoading,
		error,
	} = useQuery(get_all_item_groups, {
		skip: authLoading || !userToken,
		fetchPolicy: "cache-first",
		// fetchPolicy: "cache-and-network",
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
		skip: authLoading || !userToken,
		onData: ({ data: subscriptionData, client }) => {
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
													itemDescription
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
													itemDescription
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
				console.warn("⚠️ Cache update skipped:", err.message);
			}
		},
		onError: (err) => console.error("🚨 Subscription error:", err),
	});

	return <ItemGroupsContext.Provider value={{ items, loading: queryLoading || authLoading, error }}>{children}</ItemGroupsContext.Provider>;
}

export function useItemGroups() {
	return useContext(ItemGroupsContext);
}
