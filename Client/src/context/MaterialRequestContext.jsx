import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_material_requests } from "../../graphQL/queries/queries";
import { MATERIAL_REQUEST_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions";
import { useAuth } from "./AuthContext";

const MaterialRequestsContext = createContext();

export function MaterialRequestsProvider({ children }) {
	const { loading: authLoading, userToken } = useAuth(); // wait for auth token
	const [requests, setRequests] = useState([]);

	const {
		data,
		loading: queryLoading,
		error,
	} = useQuery(get_all_material_requests, {
		skip: authLoading || !userToken, // don't query until token is ready
		// fetchPolicy: "cache-first",
		fetchPolicy: "cache-and-network",
	});

	// Initial load
	useEffect(() => {
		if (data?.getAllMaterialRequests) {
			setRequests(data.getAllMaterialRequests);
		}
	}, [data]);

	// Subscription
	useSubscription(MATERIAL_REQUEST_CHANGE_SUBSCRIPTION, {
		skip: authLoading || !userToken, // skip subscription until token ready
		onData: ({ data: subscriptionData, client }) => {
			const changeEvent = subscriptionData?.data?.onMaterialRequestChange;
			if (!changeEvent) return;

			const { eventType, changeType, change, changes } = changeEvent;
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			if (!changesArray.length) return;

			setRequests((prev) => {
				let updated = [...prev];

				for (const item of changesArray) {
					if (eventType === "created") {
						if (!prev.some((r) => r.id === item.id)) updated.push(item);
					} else if (eventType === "updated") {
						updated = updated.map((r) => (r.id === item.id ? { ...r, ...item } : r));
					} else if (eventType === "deleted") {
						updated = updated.filter((r) => r.id !== item.id);
					}
				}
				return updated;
			});

			// Optionally update Apollo cache
			try {
				client.cache.modify({
					fields: {
						getAllMaterialRequests(existingRefs = [], { readField }) {
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
											fragment UpdatedRequest on MaterialRequest {
												id
												items {
													id
													itemName
													quantity
												}
												requester {
													userId
													name
												}
												approvalStatus {
													isApproved
												}
											}
										`,
									});
								} else if (eventType === "created") {
									const newRef = client.cache.writeFragment({
										data: item,
										fragment: gql`
											fragment NewRequest on MaterialRequest {
												id
												items {
													id
													itemName
													quantity
												}
												requester {
													userId
													name
												}
												approvalStatus {
													isApproved
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

	return <MaterialRequestsContext.Provider value={{ requests, loading: queryLoading || authLoading, error }}>{children}</MaterialRequestsContext.Provider>;
}

export function useMaterialRequests() {
	return useContext(MaterialRequestsContext);
}
