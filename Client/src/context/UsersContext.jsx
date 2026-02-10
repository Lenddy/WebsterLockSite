import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_all_users } from "../../graphQL/queries/queries";
import { USER_CHANGE_SUBSCRIPTION } from "../../graphQL/subscriptions/subscriptions";
import { useAuth } from "./AuthContext"; // <-- import your auth context
import { jwtDecode } from "jwt-decode";
import { can } from "../component/utilities/can.js";

const UsersContext = createContext();

export function UsersProvider({ children }) {
	const { loading: authLoading, userToken, setWsDisconnected } = useAuth(); // <-- wait for auth

	const [users, setUsers] = useState([]);

	// const canReview = () => {
	// 	const token = jwtDecode(userToken);
	// 	const role = typeof token?.role === "string" ? token?.role : token?.role?.role;
	// 	return ["headAdmin", "admin", "subAdmin"].includes(role);
	// };

	const canReview = () => {
		if (!userToken) return false;

		const token = jwtDecode(userToken);

		// Extract role safely whether it's: "admin" OR { role: "admin" }
		const role = typeof token?.role === "string" ? token.role : token?.role?.role;
		//  hasReviewRole && hasPermission;
		return ["headAdmin", "admin", "subAdmin"].includes(role) && can(token, "users:read:any");
	};

	// if(canReview) {return}

	// Only run query when AuthContext is loaded and token exists
	const {
		data,
		loading: queryLoading,
		error,
	} = useQuery(get_all_users, {
		// skip: !userToken, // <-- SKIP until token is ready
		skip: authLoading || !userToken || !canReview(), // <-- SKIP until token is ready
		// fetchPolicy: "cache-first",
		fetchPolicy: "cache-and-network",
	});
	// console.log("this is the data example:", data);

	// Initial load
	useEffect(() => {
		if (data?.getAllUsers) {
			console.log("get all data from the users context", data?.getAllUsers);
			setUsers(data.getAllUsers);
		}
	}, [data]);

	// Live subscription
	useSubscription(USER_CHANGE_SUBSCRIPTION, {
		skip: authLoading || !userToken || !canReview(), // <-- skip subscription until token ready
		onData: ({ data: subscriptionData, client }) => {
			// console.log("📡 Subscription raw data:", subscriptionData);

			const changeEvent = subscriptionData?.data?.onUserChange;
			if (!changeEvent) return;

			const { eventType, changeType, change, changes } = changeEvent;

			// Normalize into an array so downstream logic doesn’t have to care
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			if (!changesArray.length) return;

			// console.log(`📡 User subscription event: ${eventType}, changeType: ${changeType}, count: ${changesArray.length}`);

			// --- Update local state ---
			setUsers((prevUsers) => {
				let updated = [...prevUsers];

				for (const Changes of changesArray) {
					if (eventType === "created") {
						const exists = prevUsers.some((u) => u.id === Changes.id);
						if (!exists) updated = [...updated, Changes];
					} else if (eventType === "updated") {
						updated = updated.map((u) => (u.id === Changes.id ? { ...u, ...Changes } : u));
					} else if (eventType === "deleted") {
						updated = updated.filter((u) => u.id !== Changes.id);
					}
				}

				// Apply search/filtering
				// const sorted = updated; // optionally add a sort function if needed
				// if (searchValue) setFilteredUsers(applyFuse(sorted, searchValue));
				// else setFilteredUsers(sorted);

				return updated;
			});

			// const evt = subscriptionData?.data?.onUserChange;
			// if (!evt) return;

			// const { eventType, changeType, change, changes } = evt;

			// const items = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			// if (!items.length) return;

			// setUsers((prev) => {
			// 	let updated = [...prev];
			// 	for (const u of items) {
			// 		if (eventType === "created") {
			// 			if (!updated.some((x) => x.id === u.id)) updated.push(u);
			// 		} else if (eventType === "updated") {
			// 			updated = updated.map((x) => (x.id === u.id ? { ...x, ...u } : x));
			// 		} else if (eventType === "deleted") {
			// 			updated = updated.filter((x) => x.id !== u.id);
			// 		}
			// 	}
			// 	return updated;
			// });

			// Update Apollo cache
			try {
				client.cache.modify({
					fields: {
						getAllUsers(existingRefs = [], { readField }) {
							let newRefs = [...existingRefs];

							if (changeType === "single") {
								// Extract the single user from the subscription
								const u = changeEvent.change;
								if (!u) return existingRefs;

								const id = u.id;

								// Clone
								let newRefs = [...existingRefs];

								// Helper to write fragment
								const writeUserFragment = (data) =>
									client.cache.writeFragment({
										data,
										fragment: gql`
											fragment UserFrag on User {
												id
												name
												email
												role
												permissions
												job
												employeeNum
												department
												token
											}
										`,
									});

								// ---- DELETE (single) ----
								if (eventType === "deleted") {
									return newRefs.filter((ref) => readField("id", ref) !== id);
								}

								// ---- UPDATE (single) ----
								const idx = newRefs.findIndex((ref) => readField("id", ref) === id);
								if (idx > -1 && eventType === "updated") {
									newRefs[idx] = writeUserFragment(u);
									return newRefs;
								}

								// ---- CREATE (single) ----
								if (eventType === "created") {
									const newRef = writeUserFragment(u);
									newRefs.push(newRef);
									return newRefs;
								}

								return newRefs;
							} else {
								for (const u of changeEvent) {
									if (eventType === "deleted") {
										newRefs = newRefs.filter((ref) => readField("id", ref) !== u.id);
										continue;
									}
									const idx = newRefs.findIndex((ref) => readField("id", ref) === u.id);
									if (idx > -1 && eventType === "updated") {
										newRefs[idx] = client.cache.writeFragment({
											data: u,
											fragment: gql`
												fragment UpdatedUser on User {
													id
													name
													email
													role
													permissions
													employeeNum
													department
													token
												}
											`,
										});
									} else if (eventType === "created") {
										const newRef = client.cache.writeFragment({
											data: u,
											fragment: gql`
												fragment NewUser on User {
													id
													name
													email
													role
													permissions
													employeeNum
													department
													token
												}
											`,
										});
										newRefs.push(newRef);
									}
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
		onError: (err) => {
			console.error("Subscription error:", err);
			if (err?.message?.includes("Socket closed") || err?.networkError) {
				setWsDisconnected(true);
			}
		},
	});

	return <UsersContext.Provider value={{ users, loading: queryLoading || authLoading, error }}>{children}</UsersContext.Provider>;
}

// console.log(user);

export function useUsers() {
	return useContext(UsersContext);
}
