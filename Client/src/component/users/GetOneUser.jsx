import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { get_one_user } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation } from "react-router-dom";
import UpdateOneUser from "./updateOneUser";
import Modal from "../Modal";
import DeleteOneUser from "./DeleteOneUser";
import { useAuth } from "../../context/AuthContext"; // <-- use context

export default function GetOneUser() {
	const { userId } = useParams();
	const location = useLocation();
	const currentRoutePath = location.pathname;

	const { userToken, logUser } = useAuth(); // <-- get user info from context
	const [user, setUser] = useState({});
	const [isOpen, setIsOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [btnActive, setBtnActive] = useState(false);

	const { error, loading, data, refetch } = useQuery(get_one_user, {
		variables: { id: userId },
	});

	useEffect(() => {
		if (data) {
			console.log("Fetched user:", data.getOneUser);
			setUser(data.getOneUser);
		}
	}, [data]);

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
						<h1>Name: {user.name}</h1>
						<h1>Email: {user.email}</h1>
					</div>

					{/* Middle */}
					<div className="get-one-content-wrapper-middle">
						{/* Left */}
						<div className="get-one-content-wrapper-middle-left">
							<div className="get-one-content-wrapper-middle-left-top">
								<div className="get-one-content-wrapper-middle-left-top-wrapper">
									<h2>Role: {user.role}</h2>
								</div>
							</div>

							<div className="get-one-content-wrapper-middle-left-bottom">
								<h2>Permissions:</h2>
								<div className="get-one-content-wrapper-middle-left-bottom-wrapper">
									<div>
										<h3>User Actions:</h3>
										<ul>
											{Object.entries(user?.permissions || {})
												.filter(([k, v]) => k !== "__typename" && v === true && k.includes("Users"))
												.map(([k]) => (
													<li key={k}>{formatKey(k) || "N/A"}</li>
												))}
										</ul>
									</div>

									<div>
										<h3>Self Actions:</h3>
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
								<h2>Job Title: {user?.job?.title || "N/A"}</h2>
							</div>
							<div className="get-one-content-wrapper-middle-right-bottom">
								<h2>Job Description: {user?.job?.description || "N/A"}</h2>
							</div>
						</div>
					</div>

					{/* Bottom actions */}
					<div className="get-one-content-wrapper-bottom">
						<Link to={getUpdateRoute()}>
							<span>Update</span>
						</Link>
						<span
							className="table-action last"
							onClick={() => {
								setSelectedUser(user);
								setIsOpen(true);
								setBtnActive(true);
							}}>
							Delete
						</span>
					</div>

					<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={selectedUser} btnActive={btnActive} />
				</div>
			)}

			{error && <p style={{ color: "red" }}>{error.message}</p>}
		</div>
	);
}

// import React, { useEffect, useState } from "react";
// import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
// import { jwtDecode } from "jwt-decode";
// import { get_one_user } from "../../../graphQL/queries/queries";
// import { Link, useParams, useLocation } from "react-router-dom";
// import UpdateOneUser from "./updateOneUser";

// import Modal from "../Modal";
// import DeleteOneUser from "./DeleteOneUser";

// export default function GetOneUser({ userToken }) {
// 	const [user, setUser] = useState({});
// 	const [logUser, setLogUser] = useState({});
// 	const { userId } = useParams();
// 	const [isOpen, setIsOpen] = useState(false);
// 	const [selectedUser, setSelectedUser] = useState(null);
// 	const location = useLocation();
// 	const currentRoutePath = location.pathname;
// 	const [btnActive, setBtnActive] = useState(false);
// 	// console.log(currentRoutePath);
// 	const { error, loading, data, refetch } = useQuery(get_one_user, { variables: { id: userId } });

// 	useEffect(() => {
// 		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
// 		if (loading) {
// 			// console.log("loading");
// 		}
// 		if (data) {
// 			console.log(data.getOneUser);
// 			setUser(data.getOneUser);
// 		}
// 		if (error) {
// 			// console.log("there was an error", error);
// 		}
// 		// const fetchData = async () => {
// 		// 	await refetch();
// 		// };
// 		// fetchData();
// 	}, [loading, data, error]); //refetch

// 	// Helper function to format keys
// 	const formatKey = (key) => {
// 		return key
// 			.replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters
// 			.replace(/^./, (str) => str.toUpperCase()); // capitalize first letter
// 	};

// 	//  separate the roles too  and capitalized the first letters

// 	return (
// 		<div className="get-one-container list-get-all-content">
// 			{currentRoutePath === `/user/${userId}/update` ? (
// 				<UpdateOneUser userId={userId} user={user} />
// 			) : loading ? (
// 				<div>
// 					<h1>loading...</h1>
// 				</div>
// 			) : (
// 				<div className="get-one-content-wrapper ">
// 					{/* top */}
// 					<div className="get-one-content-wrapper-top">
// 						<h1>Name: {user.name}</h1>

// 						<h1>Email:{user.email}</h1>
// 					</div>

// 					{/* middle */}
// 					<div className="get-one-content-wrapper-middle">
// 						{/* middle left */}
// 						<div className="get-one-content-wrapper-middle-left">
// 							{/* middle left top */}
// 							<div className="get-one-content-wrapper-middle-left-top">
// 								<div className="get-one-content-wrapper-middle-left-top-wrapper">
// 									<h2>Role: {user.role} </h2>
// 								</div>
// 							</div>

// 							{/* middle left bottom */}
// 							<div className="get-one-content-wrapper-middle-left-bottom">
// 								<h2>Permissions:</h2>

// 								<div className="get-one-content-wrapper-middle-left-bottom-wrapper">
// 									<div>
// 										<h3>User Actions:</h3>
// 										<ul>
// 											{Object.entries(user?.permissions || {})
// 												.filter(([k, v]) => k !== "__typename" && v === true && k.includes("Users"))
// 												.map(([k]) => (
// 													<li key={k}>{formatKey(k) || "N/A"}</li>
// 												))}
// 										</ul>
// 									</div>

// 									<div>
// 										<h3>Self Actions:</h3>
// 										<ul>
// 											{Object.entries(user?.permissions || {})
// 												.filter(([k, v]) => k !== "__typename" && v === true && k.includes("Self"))
// 												.map(([k]) => (
// 													<li key={k}>{formatKey(k)}</li>
// 												))}
// 										</ul>
// 									</div>
// 								</div>
// 							</div>
// 						</div>

// 						{/* middle right */}
// 						<div className="get-one-content-wrapper-middle-right">
// 							<div className="get-one-content-wrapper-middle-right-top">
// 								<h2>Job Title:{user?.job?.title}</h2>
// 							</div>

// 							<div className="get-one-content-wrapper-middle-right-bottom">
// 								<h2> Job Description: {user?.job?.description}</h2>
// 							</div>
// 						</div>
// 					</div>

// 					<div className="get-one-content-wrapper-bottom">
// 						<Link to={jwtDecode(localStorage.getItem("UserToken")).role === "headAdmin" || jwtDecode(localStorage.getItem("UserToken")).role.role === "admin" ? `/admin/user/${user.id}/update` : `/user/${user.id}/update`}>
// 							<span>Update</span>
// 						</Link>{" "}
// 						{/* <span>delete</span> */}
// 						<span
// 							className="table-action last"
// 							onClick={() => {
// 								setSelectedUser(user);
// 								setIsOpen(true);
// 								setBtnActive(true);
// 							}}>
// 							Delete
// 						</span>
// 						{/* <DeleteOneUser userId={userId} /> */}
// 					</div>
// 					<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} data={selectedUser} userToken={userToken} btnActive={btnActive} />
// 				</div>
// 			)}

// 			{/* {error && <p style={{ color: "red" }}> {error.message}</p>} */}
// 			{/* <h1>hello: {userId}</h1> */}
// 		</div>
// 	);
// }
