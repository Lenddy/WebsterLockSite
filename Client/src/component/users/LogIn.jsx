import { log_In_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { Await, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function LogIn() {
	const [info, setInfo] = useState({});
	const navigate = useNavigate();
	const [logInUser, { data, loading, error }] = useMutation(log_In_user);
	const [show, setShow] = useState(false);
	const [validation, setValidation] = useState();
	// console.log(show);

	const SubmissionInfo = (e) => {
		setInfo({
			...info,
			[e.target.name]: e.target.value,
		});
	};

	const submit = async (e) => {
		e.preventDefault();

		try {
			const { data } = await logInUser({
				variables: {
					input: {
						email: info.email,
						password: info.password,
					},
				},
				onCompleted: (result) => {
					console.log("Mutation success:", result);
				},
			});

			const token = data?.loginUser?.token;
			if (token) {
				localStorage.setItem("UserToken", token);

				// Decode without verifying (for quick redirect only)
				const decoded = jwtDecode(token);
				console.log("Decoded token:", decoded);

				// Redirect based on role
				if (decoded?.role && decoded.role !== "user" && decoded.role !== "noRole") {
					navigate("/allUsers");
				} else {
					navigate("/test");
				}
			}
		} catch (err) {
			console.error("Mutation error:", err);
		}
	};

	return (
		<div>
			<form onSubmit={submit}>
				<div>
					<label htmlFor="email">email:</label>
					<input type="text" name="email" onChange={(e) => SubmissionInfo(e)} />
				</div>
				<div>
					<label htmlFor="password">password: </label>
					<input type={show === true ? "text" : "password"} name="password" onChange={(e) => SubmissionInfo(e)} />
					<button type="button" onClick={() => setShow(!show)}>
						{show === false ? "show" : "hide"}
					</button>
				</div>

				<div className="validation"> {/* <p color="red"> {validation} </p>{" "} */}</div>
				<button type="submit" disabled={loading}>
					{loading ? "logging in ..." : "Log in"}
				</button>

				{error && <p style={{ color: "red" }}>{error.message}</p>}
			</form>
		</div>
	);
}
