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
import { can } from "../utilities/can";

// import NavBar from "../NavBar";

export default function LogIn({ screenWidth }) {
	const { setUserToken, userToken } = useAuth(); //  get setter from context
	const [info, setInfo] = useState({ email: "", password: "" }); //stores the info to be send to the back end
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

	console.log("this is the info from the log in ", info);
	// submiting information for user to log in
	const submit = async (e) => {
		e.preventDefault();

		try {
			// grabbing variables that are to be submited so the users can log in
			const { data } = await logInUser({
				variables: {
					input: {
						email: info.email,
						password: info.password,
					},
				},
			});
			// garbing the users token
			const token = data?.loginUser?.token;

			if (token) {
				// Check if a token already exists
				const existingToken = localStorage.getItem("userToken");
				if (existingToken) {
					// Automatically log out the previous user
					localStorage.removeItem("userToken");
					setUserToken(null); // reset context

					// Notify user that the previous users was log out
					toast.warn(t("previous-session-was-logged-out-to-allow-this-login"), { autoClose: 5000 });
				}

				// Save new token
				localStorage.setItem("userToken", token);
				setUserToken(token);

				// Decode quickly to check role
				const decoded = jwtDecode(token);

				// if user can read any material request they will go to see all the request
				if (can(decoded, "requests:read:any")) {
					navigate("/material/request/all");
				} else {
					// if user can read only their own material request they go to the mane a new material request
					if (can(decoded, "requests:read:own", { ownerId: decoded.userId })) {
						navigate("/material/request");
						// if user cant read any or own  material request they will go to the user profile  route
					} else {
						navigate(`/user/${decoded.userId}`);
					}
				}
			}
		} catch (err) {
			console.error("Mutation error:", err);
		}
	};

	return (
		<div>
			<div className="language-btn-container">
				{/* loops over the language obj to renders btn  */}
				{languages.map((language) => (
					<button className="language-btn" onClick={() => i18n.changeLanguage(language.code)} key={language.code}>
						{language.name}
					</button>
				))}
			</div>

			<div className="log-in-container">
				{/* render a btn that takes uses to see all request ,make a new request or to see their profile */}
				{userToken && (
					<div className="back-home">
						<p>
							{t("user")} {jwtDecode(userToken).name} {t("user-is-log-in")}
						</p>

						<Link to={`${can(jwtDecode(userToken), "requests:read:any") ? "/material/request/all" : can(jwtDecode(userToken), "requests:read:own") ? "/material/request" : "/material/request"}`}>
							{/* to={`${["headAdmin", "admin", "subAdmin"].includes(jwtDecode(userToken).role) ? "/material/request/all" : "/material/request"}`}> */}
							<button className="">
								{t("home")} {"->"}
							</button>
							{/* Back Home */}
						</Link>
					</div>
				)}

				<form onSubmit={submit} className="log-in-form">
					<h1 className="log-in-tite">{t("log-in")}</h1> {/* LogIn */}
					<div className="log-in-email-container">
						<div>
							<input type="text" name="email" onChange={(e) => SubmissionInfo(e)} placeholder="Email" className="log-in-form-input" />
						</div>
						<div className="error-message">{info.email <= 0 && <p>{t("email-is-required")}</p>}</div>
					</div>
					<div className="log-in-password-container">
						<div className="password-container">
							<input type={show === true ? "text" : "password"} name="password" onChange={(e) => SubmissionInfo(e)} className="log-in-form-input log-in-password" style={screenWidth <= 340 && screenWidth >= 320 ? { width: "230px" } : screenWidth <= 319 ? { width: "220px" } : {}} placeholder={t("password")} autoComplete="off" />
							{/* "Password" */}
							<div className="log-in-show-hide-container">
								<span className="log-in-show-hide" type="button" onClick={() => setShow(!show)}>
									{show === false ? <CloseEye className="eye" /> : <Eye className="eye" />}
								</span>
							</div>
						</div>

						<div>
							<div className="error-message">{info.email <= 0 && <p>{t("password-is-required")}</p>}</div>
						</div>
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
