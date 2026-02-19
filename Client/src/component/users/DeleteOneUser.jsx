import React from "react";
import { delete_one_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { can } from "../utilities/can";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";

export default function DeleteOneUser({ userId, btnActive, setIsOpen, setSelectedUser }) {
	const [deleteOneUser, { data: UpdateData, loading: updateLoading, error: updateError }] = useMutation(delete_one_user);
	const { userToken } = useAuth();

	const { t } = useTranslation();

	const navigate = useNavigate();
	const submit = async () => {
		try {
			await deleteOneUser({
				variables: {
					id: userId,
				},
				onCompleted: (result) => {
					// console.log("admin updateMutation success:", result);
					// console.log;
					toast.success(t("user-deleted-successfully"));
					setIsOpen(false);
					setSelectedUser(null); //
					// console.log("this is the the set is open in the delete one user component" , )
				},
			});

			// console.log(" Registered user:", res.data);
			// navigate(`/user/all`);
		} catch (err) {
			console.error(" Error registering:", err);
		}
	};

	console.log();

	// can(jwtDecode(userToken), "users:delete:own") ||
	// 				(can(jwtDecode(userToken), "users:delete:any")

	return (
		<>
			{/* {can(jwtDecode(userToken), "users:delete:own") ||
				(can(jwtDecode(userToken), "users:delete:any") && (
					<span onClick={submit} className={`${btnActive === true ? "model-bottom" : ""}`}>
						{" "}
						{t("delete")}
					</span>
					
				))} */}
			<span onClick={submit} className={`${btnActive === true ? "model-bottom" : ""}`}>
				{" "}
				{t("delete")}
			</span>
		</>
	);
}
