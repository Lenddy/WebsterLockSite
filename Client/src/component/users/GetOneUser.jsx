import React, { useEffect, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client"; // Import useQuery hook to execute GraphQL queries
import { jwtDecode } from "jwt-decode";
import { get_one_user } from "../../../graphQL/queries/queries";
import { Link, useParams, useLocation } from "react-router-dom";
import UpdateOneUser from "./updateOneUser";

import DeleteOneUser from "./DeleteOneUser";

export default function GetOneUser() {
	const [user, setUser] = useState({});
	const [logUser, setLogUser] = useState({});
	const { userId } = useParams();

	const location = useLocation();
	const currentRoutePath = location.pathname;
	// console.log(currentRoutePath);
	const { error, loading, data, refetch } = useQuery(get_one_user, { variables: { id: userId } });

	useEffect(() => {
		setLogUser(jwtDecode(localStorage.getItem("UserToken")));
		if (loading) {
			// console.log("loading");
		}
		if (data) {
			// console.log(data.getOneUser);
			setUser(data.getOneUser);
		}
		if (error) {
			// console.log("there was an error", error);
		}
		// const fetchData = async () => {
		// 	await refetch();
		// };
		// fetchData();
	}, [loading, data, error]); //refetch

	return (
		<div className="get-one-container list-get-all-content">
			{currentRoutePath === `/user/${userId}/update` ? (
				<UpdateOneUser userId={userId} user={user} />
			) : loading ? (
				<div>
					<h1>loading...</h1>
				</div>
			) : (
				<div className="get-one-content-wrapper ">
					<div className="get-one-content-wrapper-top">
						<h1>name: {user.name}</h1>
						<h1>email:{user.email}</h1>
					</div>

					<div className="get-one-content-wrapper-middle">
						<div className="">
							<h2>Role: {user.role}</h2>
							<h2>permission </h2>
						</div>

						<div>
							<>job: {user?.job?.title === null || user?.job?.title === undefined ? "no job available" : user?.job?.title}</>
						</div>
					</div>

					<div className="get-one-content-wrapper-bottom">
						<div>
							<p>action</p>
						</div>
						<span>update</span>
						<span>delete</span>
						{/* <DeleteOneUser userId={userId} /> */}
					</div>
				</div>
			)}

			{/* {error && <p style={{ color: "red" }}> {error.message}</p>} */}
			{/* <h1>hello: {userId}</h1> */}
		</div>
	);
}
