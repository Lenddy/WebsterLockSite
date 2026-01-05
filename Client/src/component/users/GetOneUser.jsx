import { useEffect, useState, useMemo } from "react";
import { useQuery, useSubscription, gql } from "@apollo/client";
import { get_one_user } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import UpdateOneUser from "./UpdateOneUser";
import { USER_CHANGE_SUBSCRIPTION } from "../../../graphQL/subscriptions/subscriptions";
import Modal from "../Modal";
import DeleteOneUser from "./DeleteOneUser";
import { useAuth } from "../../context/AuthContext"; // <-- use context
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
// import { useUsers } from "../../../context/UsersContext";

export default function GetOneUser() {
	const { userId } = useParams();
	const location = useLocation();
	const currentRoutePath = location.pathname;
	const navigate = useNavigate();

	// const { users, loading, error } = useUsers();

	const { userToken, setPageLoading, setWsDisconnected } = useAuth(); // <-- get user info from context
	const [logUser, setLogUser] = useState();
	const [user, setUser] = useState({});
	const [isOpen, setIsOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [btnActive, setBtnActive] = useState(false);

	const { t } = useTranslation();

	//REVIEW - you get a lot of alerts and also  a warning that the navigate  should be put inside of a use effect  find a way to  prevent this errors or just simply redirect  with out alert

	const decodedUser = useMemo(() => {
		if (!userToken) return null;
		try {
			return JSON.parse(atob(userToken.split(".")[1])); // simple JWT decode
		} catch (err) {
			console.error("Invalid token", err);
			return null;
		}
	}, [userToken]);

	const canUserReview = useMemo(() => {
		if (!decodedUser || !userId) return false;

		const role = typeof decodedUser.role === "string" ? decodedUser.role : decodedUser.role?.role;

		const hasRole = ["headAdmin", "admin", "subAdmin"].includes(role);
		const isOwner = decodedUser.userId === userId;

		return hasRole || isOwner;
	}, [decodedUser, userId]);

	useEffect(() => {
		if (!canUserReview) {
			navigate("/material/request/all", { replace: true });
		}
	}, [canUserReview, navigate]);

	// const canReview = () => {
	// 	const token = decodedUser;
	// 	const role = typeof token?.role === "string" ? token?.role : token?.role?.role;
	// 	return ["headAdmin", "admin", "subAdmin"].includes(role);
	// };

	// if (canReview() !== true || jwtDecode(userToken).userId !== userId) {
	// 	navigate("/material/request/all");
	// 	alert("you dont have permission to be able to see this page");
	// }

	const { error, loading, data, refetch } = useQuery(get_one_user, {
		variables: { id: userId },
	});

	useEffect(() => {
		setLogUser(jwtDecode(userToken));
		setPageLoading(loading);
		if (data) {
			console.log("Fetched user:", data.getOneUser);
			setUser(data.getOneUser);
		}
	}, [data, setPageLoading, loading, userToken]);

	// Helper function to format keys
	const formatKey = (key) =>
		key
			.replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters
			.replace(/^./, (str) => str.toUpperCase()); // capitalize first letter

	// Determine the correct update route based on role
	const getUpdateRoute = () => {
		if (!logUser) return `/admin/user/${user.id}/update`;
		const logRole = typeof logUser.role === "string" ? logUser.role : logUser.role?.role;
		if (logRole === "headAdmin" || logRole === "admin") {
			return `/admin/user/${user.id}/update`;
		}
		return `/user/${user.id}/update`;
	};

	useSubscription(USER_CHANGE_SUBSCRIPTION, {
		onData: ({ data: subscriptionData, client }) => {
			console.log("📡 Subscription raw data:", subscriptionData);

			const changeEvent = subscriptionData?.data?.onUserChange;
			if (!changeEvent) return;

			const { eventType, changeType, change, changes } = changeEvent;

			// --- Normalize payload ---
			const changesArray = changeType === "multiple" && Array.isArray(changes) ? changes : change ? [change] : [];

			if (!changesArray.length) return;

			console.log(`📡 User subscription event: ${eventType}, changeType: ${changeType}, count: ${changesArray.length}`);

			// --- Update local state for the current user view ---
			if (userId) {
				const targetChange = changesArray.find((c) => c.id === userId);

				if (targetChange) {
					if (eventType === "updated") {
						setUser((prevUser) => ({
							...prevUser,
							...targetChange,
						}));
						if (currentRoutePath === `/user/${userId}`) {
							toast.update(t("user-has-been-updated"));
						}
					}

					if (eventType === "deleted") {
						// const isAmin = ["headAdmin","admin","subAdmin"]
						//  jwtDecode(userToken)?.role?.includes(isAmin)?
						// TODO - make logic so that the users get redirected when the notification fades or they can click a btn  to stay or be redirected  be redirected if they stay  they cant edit or do anything else  show a notification that says this
						toast.error(t("user-has-been-deleted-you-will-be-redirected-to-see-all-user"));
						navigate("/user/all");
					}
				}
			}

			// --- Update Apollo cache for all users (if applicable) ---
			try {
				client.cache.modify({
					fields: {
						getAllUsers(existingRefs = [], { readField }) {
							let newRefs = [...existingRefs];

							for (const updatedUser of changesArray) {
								if (eventType === "deleted") {
									newRefs = newRefs.filter((ref) => readField("id", ref) !== updatedUser.id);
									continue;
								}

								const existingIndex = newRefs.findIndex((ref) => readField("id", ref) === updatedUser.id);

								if (existingIndex > -1 && eventType === "updated") {
									// Replace existing reference with the updated one
									newRefs[existingIndex] = client.cache.writeFragment({
										data: updatedUser,
										fragment: gql`
											fragment UpdatedUser on User {
												id
												name
												email
												role
												permissions {
													canEditUsers
													canViewUsers
													canDeleteUsers
													canChangeRole
													canEditSelf
													canViewSelf
													canViewAllUsers
													canNotBeDeleted
													canNotBeUpdated
													canRegisterUser
												}
												job {
													title
													description
												}
												employeeNum
												department
												token
											}
										`,
									});
								} else if (eventType === "created") {
									const newRef = client.cache.writeFragment({
										data: updatedUser,
										fragment: gql`
											fragment NewUser on User {
												id
												name
												email
												role
												permissions {
													canEditUsers
													canViewUsers
													canDeleteUsers
													canChangeRole
													canEditSelf
													canViewSelf
													canViewAllUsers
													canNotBeDeleted
													canNotBeUpdated
													canRegisterUser
												}
												job {
													title
													description
												}
												employeeNum
												department
												token
											}
										`,
									});
									newRefs = [...newRefs, newRef];
								}
							}

							return newRefs;
						},
					},
				});
			} catch (cacheErr) {
				console.warn("⚠️ Cache update skipped:", cacheErr.message);
			}
		},

		onError: (err) => {
			console.error("Subscription error:", err);
			if (err?.message?.includes("Socket closed") || err?.networkError) {
				setWsDisconnected(true);
			}
		},
	});

	return (
		<div className="get-one-container list-get-all-content">
			{currentRoutePath === `/user/${userId}/update` ? (
				<UpdateOneUser userId={userId} user={user} />
			) : loading ? (
				<div>
					<h1>Loading...</h1>
				</div>
			) : (
				<div className="get-one-content-wrapper">
					{/* Top */}
					<div className="get-one-content-wrapper-top">
						<h1>#: {user.employeeNum}</h1>
						<h1>
							{t("name")}: {user.name}
						</h1>
						<h1>
							{t("email")}: {user.email}
						</h1>
						<h1>
							{t("dep")}: {user.department}
						</h1>
					</div>

					{/* Middle */}
					<div className="get-one-content-wrapper-middle">
						{/* Left */}
						<div className="get-one-content-wrapper-middle-left">
							<div className="get-one-content-wrapper-middle-left-top">
								<div className="get-one-content-wrapper-middle-left-top-wrapper">
									<h2>
										{t("role")}: {user.role}
									</h2>
								</div>
							</div>

							<div className="get-one-content-wrapper-middle-left-bottom">
								<h2>{t("permissions")}:</h2>
								<div className="get-one-content-wrapper-middle-left-bottom-wrapper">
									<div>
										<h3>{t("user-actions")}:</h3>
										<ul>
											{Object.entries(user?.permissions || {})
												.filter(([k, v]) => k !== "__typename" && v === true && k.includes("Users"))
												.map(([k]) => (
													<li key={k}>{formatKey(k) || "N/A"}</li>
												))}
										</ul>
									</div>

									<div>
										<h3>{t("self-actions")}:</h3>
										<ul>
											{Object.entries(user?.permissions || {})
												.filter(([k, v]) => k !== "__typename" && v === true && k.includes("Self"))
												.map(([k]) => (
													<li key={k}>{formatKey(k)}</li>
												))}
										</ul>
									</div>
								</div>
							</div>
						</div>

						{/* Right */}
						<div className="get-one-content-wrapper-middle-right">
							<div className="get-one-content-wrapper-middle-right-top">
								<h2>
									{t("job-title")}: {user?.job?.title || "N/A"}
								</h2>
							</div>
							<div className="get-one-content-wrapper-middle-right-bottom">
								<h2>
									{t("job-description")}: {user?.job?.description || "N/A"}
								</h2>
							</div>
						</div>
					</div>

					{/* Bottom actions */}
					<div className="get-one-content-wrapper-bottom">
						<Link to={getUpdateRoute()}>
							<span>{t("update")}</span>
						</Link>
						<span
							className="table-action last"
							onClick={() => {
								setSelectedUser(user);
								setIsOpen(true);
								setBtnActive(true);
							}}>
							{t("delete")}
						</span>
					</div>

					<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={selectedUser} btnActive={btnActive} />
				</div>
			)}

			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</div>
	);
}
