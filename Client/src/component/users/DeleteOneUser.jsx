import React from "react";
import { delete_one_user } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { Await, useNavigate, useLocation } from "react-router-dom";

export default function DeleteOneUser({ userId, btnActive }) {
	const [deleteOneUser, { data: UpdateData, loading: updateLoading, error: updateError }] = useMutation(delete_one_user);

	const navigate = useNavigate();
	const submit = async () => {
		try {
			await deleteOneUser({
				variables: {
					id: userId,
				},
				onCompleted: (result) => {
					// console.log("admin updateMutation success:", result);
					console.log;
				},
			});

			// console.log("✅ Registered user:", res.data);
			// navigate(`/user/all`);
		} catch (err) {
			console.error("❌ Error registering:", err);
		}
	};

	return (
		<span onClick={submit} className={`${btnActive === true ? "model-bottom" : ""}`}>
			{" "}
			Delete
		</span>
	);
}
