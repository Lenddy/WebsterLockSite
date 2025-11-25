import { useEffect, useState, useRef, useMemo } from "react";
import { useMutation } from "@apollo/client";
import { update_One_user } from "../../../graphQL/mutations/mutations";
import Eye from "../../assets/eye.svg?react";
import CloseEye from "../../assets/closeEye.svg?react";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function UpdateOneUser() {
	// user
	const { userId } = useParams();

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

	const submit = async (e) => {
		e.preventDefault();
		try {
			await updateUserProfile({
				variables: {
					id: userId,
					input: {
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
					},
				},
				onCompleted: () => {
					alert(t("user-updated-successfully"));
				},
			});
		} catch (err) {
			console.error("Error updating user:", err);
		}
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
							</div>

							<div className="form-row-top-left">
								<label htmlFor="employeeNum">{t("employee-number")}</label>
								<input type="text" name="employeeNum" value={info.employeeNum} onChange={SubmissionInfo} />
							</div>

							<div className="form-row-top-right">
								<label htmlFor="department">{t("department")}</label>
								<input type="text" name="department" value={info.department} onChange={SubmissionInfo} />
							</div>
						</div>

						{/* Center Section */}
						<div className="form-row-center-container">
							<div className="form-row-center-left">
								<div className="form-row-center-left-wrapper">
									<div>
										<label htmlFor="name">{t("new-name")}</label>
										<input type="text" name="name" value={info.name} onChange={SubmissionInfo} />
									</div>

									<div>
										<label htmlFor="newEmail">{t("new-email")}</label>
										<input type="text" name="newEmail" value={info.newEmail} onChange={SubmissionInfo} />
									</div>

									<div>
										<label>{t("previous-password")}</label>
										<div className="update-form-input">
											<input type={show ? "text" : "password"} name="previousPassword" value={info.previousPassword} onChange={SubmissionInfo} placeholder={t("previous-password")} />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>

									<div>
										<label>{t("new-password")}</label>
										<div className="update-form-input">
											<input type={show ? "text" : "password"} name="newPassword" value={info.newPassword} onChange={SubmissionInfo} />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>

									<div>
										<label>{t("confirm-password")}</label>
										<div className="update-form-input">
											<input type={show ? "text" : "password"} name="confirmNewPassword" value={info.confirmNewPassword} onChange={SubmissionInfo} />
											<span className="update-form-show-hide" onClick={() => setShow(!show)}>
												{show ? <CloseEye className="update-eye" /> : <Eye className="update-eye" />}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="form-row-center-right">
								<div className="form-row-center-right-wrapper">
									<div>
										<label htmlFor="title">{t("job-title")}</label>
										<input type="text" name="title" value={info.title} onChange={SubmissionInfo} placeholder={decodedUser?.job?.title} />
									</div>

									<div>
										<label>{t("new-job-description")}</label>
										<textarea name="description" value={info.description} onChange={SubmissionInfo} placeholder={t("new-job-description")}></textarea>
									</div>

									{/* <div>
										<label>New Role:</label>
										<select name="newRole" value={info.newRole} onChange={SubmissionInfo}>
											<option value="" disabled>
												Select Role
											</option>
											<option value="admin">Admin</option>
											<option value="subAdmin">Sub Admin</option>
											<option value="technician">Technician</option>
											<option value="user">User</option>
											<option value="noRole">No Role</option>
										</select>
									</div> */}
								</div>
							</div>
						</div>

						{/* Permissions Section */}
						{/* <div className="form-row-center-bottom">
							<div className="permissions-grid">
								<div>
									<label>User Permissions</label>
									<ul className="permissions-list">
										{Object.keys(info.newPermissions)
											.filter((key) => key.includes("Users") || key.includes("Role"))
											.map((key) => (
												<li key={key}>
													<label>
														{formatKey(key)}
														<input type="checkbox" name={key} checked={info.newPermissions[key]} onChange={SubmissionInfo} />
													</label>
												</li>
											))}
									</ul>
								</div>

								<div>
									<label>Self Permissions</label>
									<ul className="permissions-list">
										{Object.keys(info.newPermissions)
											.filter((key) => key.includes("Self"))
											.map((key) => (
												<li key={key}>
													<label>
														{formatKey(key)}
														<input type="checkbox" name={key} checked={info.newPermissions[key]} onChange={SubmissionInfo} />
													</label>
												</li>
											))}
									</ul>
								</div>
							</div>
						</div> */}
					</div>
				</div>

				<div className="validation"></div>

				{/* <button type="submit" disabled={updateLoading}>
					{updateLoading ? "Updating..." : "Update"}
				</button> */}

				<div className="form-action-btn">
					<button className="form-submit-btn" type="submit" disabled={updateLoading}>
						{/* || isFormInvalid */}
						{updateLoading ? t("updating") : t("update-users")}
					</button>
				</div>

				{updateError && <p style={{ color: "red" }}>{updateError.message}</p>}
			</form>
		</div>
	);
}
