import { log_In_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { Await, useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Eye from "../../assets/eye.svg?react";
import CloseEye from "../../assets/closeEye.svg?react";
import { useAuth } from "../../context/AuthContext"; // import your context
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { toast } from "react-toastify";

// import NavBar from "../NavBar";

export default function LogIn({ screenWidth }) {
	const { setUserToken, userToken } = useAuth(); //  get setter from context
	const [info, setInfo] = useState({});
	const [blockInput, setBlockInput] = useState({});
	const navigate = useNavigate();
	const [logInUser, { data, loading, error }] = useMutation(log_In_user);
	const [show, setShow] = useState(false);
	const { t } = useTranslation();

	const languages = [
		{
			code: "en",
			name: "English",
		},
		{
			code: "es",
			name: "Español",
		},
	];

	//REVIEW - ask for a minimum limit on the passwords

	const SubmissionInfo = (e) => {
		const { name, value } = e.target;
		setInfo({
			...info,
			[name]: value,
		});

		if (name.length <= 0) setBlockInput(true);
		else if (value.length <= 0) setBlockInput(true);
		if (name.length > 0 && value.length > 0) setBlockInput(false);
	};

	// TODO -if

	const submit = async (e) => {
		e.preventDefault();

		//REVIEW - me the bank end send  error messages that are appropriate for the  users  (send info that the users and other devs can understand (one for the uses and the other for the devs ))

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
				const existingToken = localStorage.getItem("userToken");
				if (existingToken) {
					console.log("removing old token from log in ", new Date());
					// Automatically log out the previous user
					localStorage.removeItem("userToken");
					setUserToken(null); // reset context

					// Notify user
					toast.warn(t("previous-session-was-logged-out-to-allow-this-login"), { autoClose: 5000 });
				}

				// Save new token
				console.log("adding new token from log in ", new Date());
				localStorage.setItem("userToken", token);
				setUserToken(token);

				// Decode quickly to check role
				const decoded = jwtDecode(token);
				// console.log("Decoded token:", decoded);

				// Redirect based on role
				if (["headAdmin", "admin", "subAdmin"].includes(decoded.role)) {
					navigate("/material/request/all");
				} else {
					navigate("/material/request/request");
				}
			}
		} catch (err) {
			console.error("Mutation error:", err);
		}

		// 	const token = data?.loginUser?.token;
		// 	if (token) {
		// 		localStorage.setItem("userToken", token);

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

	console.log("testing stop logs on production");

	return (
		<div>
			<div className="language-btn-container">
				{/* <h1>{t("welcome")}</h1>
				<h1>{t("left")}</h1>
				<h1>{t("right")}</h1> */}

				{languages.map((language) => (
					<button className="language-btn" onClick={() => i18n.changeLanguage(language.code)} key={language.code}>
						{language.name}
					</button>
				))}
			</div>

			<div className="log-in-container">
				{userToken && (
					<div className="back-home">
						<p>
							{jwtDecode(userToken).name} {t("user-is-log-in")}{" "}
						</p>

						<Link to={`${["headAdmin", "admin", "subAdmin"].includes(jwtDecode(userToken).role) ? "/material/request/all" : "/material/request/request"}`}>
							<button className="">
								{" "}
								{t("home")} {"->"}
							</button>
							{/* Back Home */}
						</Link>
					</div>
				)}

				<form onSubmit={submit} className="log-in-form">
					<h1 className="log-in-tite">{t("log-in")}</h1> {/* LogIn */}
					<div className="log-in-email-container">
						<input type="text" name="email" onChange={(e) => SubmissionInfo(e)} placeholder="Email" className="log-in-form-input" />
					</div>
					<div className="log-in-password-container">
						<input type={show === true ? "text" : "password"} name="password" onChange={(e) => SubmissionInfo(e)} className="log-in-form-input log-in-password" style={screenWidth <= 340 && screenWidth >= 320 ? { width: "230px" } : screenWidth <= 319 ? { width: "220px" } : {}} placeholder={t("password")} autoComplete="off" />
						{/* "Password" */}

						<span className="log-in-show-hide" type="button" onClick={() => setShow(!show)}>
							{show === false ? <CloseEye className="eye" /> : <Eye className="eye" />}
						</span>
					</div>
					<button className={`form-submission-btn ${blockInput ? "disable-btn" : ""}`} type="submit" disabled={loading || blockInput}>
						{loading ? t("logging-in") : t("log-in")}
						{/* Logging In... */}
						{/* Log In */}
					</button>
					{error && <p className="form-error-message">{error.message}</p>}
				</form>
			</div>
		</div>
	);
}
