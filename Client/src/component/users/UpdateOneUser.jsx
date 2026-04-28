import { useEffect, useState, useRef, useMemo } from "react";
import { useMutation } from "@apollo/client";
import { update_One_user } from "../../../graphQL/mutations/mutations";
import Eye from "../../assets/eye.svg?react";
import CloseEye from "../../assets/closeEye.svg?react";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { can } from "../utilities/can";
import { isValidEmail } from "../utilities/emailValidator";

export default function UpdateOneUser() {
	// user
	const { userId } = useParams();
	const navigate = useNavigate();
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [formReset, setFormReset] = useState(false);
	const [toastOpen, setToastOpen] = useState(false);
	const [blockInput, setBlockInput] = useState(false);

	// include setUserToken and currentUserId if your AuthContext provides them
	const { userToken, loading: authLoading, setUserToken, currentUserId } = useAuth();

	// decode token once per token change and reuse both in render and effects
	const decodedUser = useMemo(() => {
		if (!userToken) return null;
		try {
			return jwtDecode(userToken);
		} catch (err) {
			console.error("Failed to decode token:", err);
			return null;
		}
	}, [userToken]);

	const [show, setShow] = useState(false);
	const [info, setInfo] = useState({
		previousName: decodedUser?.name,
		name: "",
		previousEmail: decodedUser?.email || "",
		newEmail: "",
		previousPassword: "",
		newPassword: "",
		confirmNewPassword: "",
		employeeNum: decodedUser?.employeeNum || "",
		department: decodedUser?.department || "",
		// newRole: user?.role || "",
		title: decodedUser?.job?.title || "",
		description: decodedUser?.job?.description || "",
		// newPermissions: { ... }
	});

	const canSubmit = () => {
		const { previousPassword, newPassword, confirmNewPassword } = info;

		// if any password field is touched, validate all three
		const anyTouched = previousPassword !== "" || newPassword !== "" || confirmNewPassword !== "";

		if (!anyTouched) return true; // no password change attempted, allow submit

		if (previousPassword === "") return false; // prev required if any field touched
		if (newPassword.length < 5) return false; // must be 5+ chars
		if (confirmNewPassword !== newPassword) return false; // must match

		return true;
	};

	// console.log(canSubmit());

	const { t } = useTranslation();
	const [updateUserProfile, { loading: updateLoading, error: updateError }] = useMutation(update_One_user);

	// Keep track of the last decoded user so we only react to actual changes
	const lastDecodedRef = useRef(null);

	// When the decoded user changes, merge values into the form state
	useEffect(() => {
		if (!decodedUser) return;

		const decodedCore = {
			previousName: decodedUser?.name,
			// name: user?.name || "",
			previousEmail: decodedUser?.email || "",
			employeeNum: decodedUser?.employeeNum || "",
			department: decodedUser?.department || "",
			title: decodedUser?.job?.title || "",
			description: decodedUser?.job?.description || "",
		};

		// if nothing changed, do nothing
		if (JSON.stringify(lastDecodedRef.current) === JSON.stringify(decodedCore)) return;

		// update the ref and merge decoded values into the form state
		lastDecodedRef.current = decodedCore;

		setInfo((prev) => ({
			...prev,
			...decodedCore,
		}));
	}, [decodedUser]);

	// Handle input and checkbox changes
	const SubmissionInfo = (e) => {
		const { name, value, type, checked } = e.target;
		setInfo((prev) => {
			if (type === "checkbox") {
				return {
					...prev,
					newPermissions: {
						...prev.newPermissions,
						[name]: checked,
					},
				};
			}
			return { ...prev, [name]: value };
		});
	};

	const formatKey = (key) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (str) => str.toUpperCase());

	const resetForm = () => {
		setInfo({
			previousName: decodedUser?.name,
			name: "",
			previousEmail: decodedUser?.email || "",
			newEmail: "",
			previousPassword: "",
			newPassword: "",
			confirmNewPassword: "",
			employeeNum: decodedUser?.employeeNum || "",
			department: decodedUser?.department || "",
		}); // or your initial requests state
		setHasSubmitted(false);
		setFormReset(true);
	};

	const SuccessToast = ({ closeToast, resetForm }) => (
		<div>
			<p>{t("your-profile-has-been-updated-successfully")}</p>

			<div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
				<button
					onClick={() => {
						closeToast();
						setBlockInput(false);
						navigate(`/user/${userId}`);
					}}>
					{t("view-profile")}
				</button>

				<button
					onClick={() => {
						resetForm();
						setBlockInput(false);
						setHasSubmitted(false);
						closeToast();
					}}>
					{t("make-another-update")}
				</button>
			</div>

			{/* <p style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>{t("duplicate-request")}</p> */}
		</div>
	);

	const submit = async (e) => {
		e.preventDefault();

		if (hasSubmitted === true) {
			toast.warn(t("duplicate-request-warning"), {
				// autoClose: false,
			});
			return;
		}

		const input = {
			name: info.name || undefined,
			previousEmail: info.previousEmail || undefined,
			newEmail: info.newEmail || undefined,
			previousPassword: info.previousPassword || undefined,
			newPassword: info.newPassword || undefined,
			confirmNewPassword: info.confirmNewPassword || undefined,
			employeeNum: info.employeeNum || undefined,
			department: info.department || undefined,
			// role: info.newRole || undefined,
			job: {
				title: info.title || undefined,
				description: info.description || undefined,
			},
			// permissions: info.newPermissions,
		};

		const mutationPromise = updateUserProfile({
			variables: {
				id: userId,
				input,
			},
			// onCompleted: (data) => {
			// 	// console.log("this is the data on update", data);
			// 	// localStorage.setItem("userToken", data?.updateUserProfile?.token);
			// 	setUserToken(data?.updateUserProfile?.token);
			// 	toast.success(t("user-updated-successfully"));
			// },
		});

		toast.promise(mutationPromise, {
			pending: t("updating-user-profile"),

			success: {
				render({ closeToast }) {
					return <SuccessToast closeToast={closeToast} resetForm={resetForm} navigate={navigate} setHasSubmitted={setHasSubmitted} t={t} />;
				},
				autoClose: false,
			},

			error: {
				render({ data }) {
					const err = data;
					if (err?.graphQLErrors?.length) {
						return err.graphQLErrors.map((e) => e.message).join(", ");
					}
					// come here
					if (err?.networkError) return t("network-error-try-again");
					return t("something-went-wrong");
				},
				autoClose: false,
			},
		});

		mutationPromise
			.then(() => {
				setHasSubmitted(true);
				setBlockInput(true);
			})
			.catch(() => {
				setHasSubmitted(false);
			});
	};

	return (
		<div className="update-container">
			<form className="update-form" onSubmit={submit}>
				<h1 className="update-form-title">{t("update-profile")}</h1>

				<div className="update-form-wrapper">
					<div className="update-form-row">
						{/* Top Section */}
						<div className="form-row-top-container">
							<div className="form-row-top-left">
								<label htmlFor="name">{t("previous-name")}</label>
								<input type="text" placeholder={decodedUser?.name} name="previousName" disabled />
							</div>

							<div className="form-row-top-right">
								<label htmlFor="previousEmail">{t("previous-email")}</label>
								<input type="text" name="previousEmail" placeholder={decodedUser?.email} disabled />
								{!isValidEmail(info.previousEmail) && info.previousEmail.length > 0 && <p className="error-message">{t("must-be-a-valid-email")}</p>}
							</div>

							<div className="form-row-top-left">
								<label htmlFor="employeeNum">{t("employee-number")}</label>
								<input type="text" name="employeeNum" value={info.employeeNum} onChange={SubmissionInfo} disabled={blockInput || !can(decodedUser, "users:update:any")} />
							</div>

							<div className="form-row-top-right">
								<label htmlFor="department">{t("department")}</label>
								<input type="text" name="department" value={info.department} onChange={SubmissionInfo} disabled={blockInput || !can(decodedUser, "users:update:any")} />
							</div>
						</div>

						{/* Center Section */}
						<div className="form-row-center-container">
							<div className="form-row-center-left">
								<div className="form-row-center-left-wrapper">
									<div>
										<label htmlFor="name">{t("new-name")}</label>
										<input type="text" name="name" placeholder="New" value={info.name} onChange={SubmissionInfo} disabled={blockInput} placeholder="New name" />
									</div>

									<div>
										<label htmlFor="newEmail">{t("new-email")}</label>
										<input type="text" name="newEmail" placeholder="New email" value={info.newEmail} onChange={SubmissionInfo} disabled={blockInput} />

										{!isValidEmail(info.newEmail) && info.newEmail.length > 0 && <p className="error-message">{t("must-be-a-valid-email")}</p>}
									</div>

									<div>
										<label>{t("previous-password")}</label>
										<div className="update-form-input">
											<input type={show ? "text" : "password"} name="previousPassword" value={info.previousPassword} onChange={SubmissionInfo} placeholder={t("previous-password")} disabled={blockInput} />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>

									<div>
										<label>{t("new-password")}</label>
										<div className="update-form-input">
											y
											<input type={show ? "text" : "password"} name="newPassword" value={info.newPassword} onChange={SubmissionInfo} disabled={blockInput} placeholder={t("new-password")} />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>

										{info.previousPassword !== "" && info.newPassword == "" && <p className="error-message">{t("new-password-is-required")}</p>}

										{info.newPassword.length > 0 && info.newPassword.length < 5 && <p className="error-message">{t("password-must-be-at least-5-characters")}</p>}
									</div>

									<div>
										<label>{t("confirm-password")}</label>
										<div className="update-form-input">
											{/* <div className="update-user-input-container"> */}
											<input type={show ? "text" : "password"} name="confirmNewPassword" value={info.confirmNewPassword} onChange={SubmissionInfo} disabled={blockInput} placeholder={t("confirm-password")} />

											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
										{/* </div> */}
										{info.newPassword !== "" && info.confirmNewPassword == "" && <p className="error-message">{t("confirm-password-is-required")}</p>}

										{info.confirmNewPassword !== "" && info.confirmNewPassword !== info.newPassword && <p className="error-message">{t("confirm-password-does-not-match")}</p>}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="validation"></div>

				<div className="form-action-btn">
					<button className="form-submit-btn" type="submit" disabled={updateLoading || !canSubmit()}>
						{/* || isFormInvalid */}
						{updateLoading ? t("updating") : t("update-users")}
					</button>
				</div>

				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
			</form>
		</div>
	);
}
