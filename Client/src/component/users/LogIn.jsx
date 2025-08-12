import { log_In_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
			console.log("✅ log  user:", data.loginUser);
			const token = await data.loginUser.token;
			if (token) {
				localStorage.setItem("UserToken", token); // Store token
				await navigate(`/test`);
			}

			console.log("Data returned from server:", data);
			// reset form, show success message, navigate, etc.
		} catch (err) {
			console.error("Mutation error:", err);
			// show error toast or message
		}
	};

	const submit1 = async (e) => {
		e.preventDefault();
		// console.log(info);

		await logInUser({
			variables: {
				input: {
					email: info.email,
					password: info.password,
				},
			},
		})
			.then(async (res) => {
				console.log("✅ log  user:", res.data.loginUser);
				const token = await res.data.loginUser.token;
				if (token) {
					localStorage.setItem("UserToken", token); // Store token
					await navigate(`/test`);
				}
			})
			.catch((err) => {
				console.error("Error logging in:", err);
				// setValidation(err?.errors );
			});
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
					{loading ? "Submitting..." : "Submit"}
				</button>

				{error && <p style={{ color: "red" }}>Error: {error.message}</p>}
			</form>
		</div>
	);
}
