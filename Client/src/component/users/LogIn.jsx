import { log_In_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { Await, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Eye from "../../assets/eye.svg?react";
import CloseEye from "../../assets/closeEye.svg?react";
import { useAuth } from "../../context/AuthContext"; // import your context

export default function LogIn({ screenWidth }) {
	const { setUserToken } = useAuth(); //  get setter from context
	const [info, setInfo] = useState({});
	const navigate = useNavigate();
	const [logInUser, { data, loading, error }] = useMutation(log_In_user);
	const [show, setShow] = useState(false);

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
			});

			const token = data?.loginUser?.token;
			if (token) {
				// Check if a token already exists
				const existingToken = localStorage.getItem("UserToken");
				if (existingToken) {
					// Automatically log out the previous user
					localStorage.removeItem("UserToken");
					setUserToken(null); // reset context

					// Notify user
					alert("Previous session was logged out to allow this login.");
				}

				// Save new token
				localStorage.setItem("UserToken", token);
				setUserToken(token);

				// Decode quickly to check role
				const decoded = jwtDecode(token);
				console.log("Decoded token:", decoded);

				// Redirect based on role
				if (["headAdmin", "admin", "subAdmin"].includes(decoded.role)) {
					navigate("/user/all");
				} else {
					navigate("/material/request/request");
				}
			}
		} catch (err) {
			console.error("Mutation error:", err);
		}

		// 	const token = data?.loginUser?.token;
		// 	if (token) {
		// 		localStorage.setItem("UserToken", token);

		// 		// Decode without verifying (for quick redirect only)
		// 		const decoded = jwtDecode(token);
		// 		console.log("Decoded token:", decoded);

		// 		// Redirect based on role
		// 		if (decoded.role !== "user" && decoded.role !== "noRole" && decoded.role !== "technician") {
		// 			navigate("/user/all");
		// 		} else {
		// 			navigate("/material/request/request");
		// 		}
		// 	}
		// } catch (err) {
		// 	console.error("Mutation error:", err);
		// }
	};

	return (
		<div className="log-in-container">
			<form onSubmit={submit} className="log-in-form">
				<h1 className="log-in-tite">LogIn</h1>
				<div className="log-in-email-container">
					<input type="text" name="email" onChange={(e) => SubmissionInfo(e)} placeholder="Email" className="log-in-form-input" />
				</div>

				<div className="log-in-password-container">
					<input type={show === true ? "text" : "password"} name="password" onChange={(e) => SubmissionInfo(e)} className="log-in-form-input log-in-password" style={screenWidth <= 340 && screenWidth >= 320 ? { width: "230px" } : screenWidth <= 319 ? { width: "220px" } : {}} placeholder="Password" />

					<span className="log-in-show-hide" type="button" onClick={() => setShow(!show)}>
						{show === false ? <CloseEye className="eye" /> : <Eye className="eye" />}
					</span>
				</div>

				<button className="form-submission-btn" type="submit" disabled={loading}>
					{loading ? "Logging In..." : "Log In"}
				</button>

				{error && <p className="form-error-message">{error.message}</p>}
			</form>
		</div>
	);
}
