import { Create_One_Material_Request } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function CreateOneMaterialRequest() {
	const [info, setInfo] = useState({});
	const [permission, setPermission] = useState({});
	const [job, setJob] = useState({});
	const navigate = useNavigate();
	const [NewMaterialRequest, { data, loading, error }] = useMutation(Create_One_Material_Request);
	const [show, setShow] = useState(false);

	// Function to handle input changes and update state accordingly
	const SubmissionInfo = (e) => {
		setInfo({
			...info,
			[e.target.name]: e.target.value,
			// permissions: permission,
		});
	};

	// // Function to handle input changes and update state accordingly
	// const SubmissionInfo = (e) => {
	// 	/**
	// 	 * Extracts the 'name' and 'value' properties from the event target.
	// 	 * Typically used in form input change handlers to identify which input field
	// 	 * triggered the event and retrieve its current value.
	// 	 *
	// 	 * @param {React.ChangeEvent<HTMLInputElement>} e - The event object from the input change.
	// 	 * @returns {string} name - The name attribute of the input element.
	// 	 * @returns {string} value - The current value of the input element.
	// 	 */
	// 	const { name, value } = e.target;
	// 	setInfo((prev) => {
	// 		if (value === "") {
	// 			const { [name]: _, ...rest } = prev;
	// 			return rest;
	// 		}
	// 		return { ...prev, [name]: value };
	// 	});
	// };

	// console.log("this is the info ", info);

	// Function to handle input changes and update state accordingly
	const permissionsInfo = (e) => {
		setPermission({
			...permission,
			[e.target.name]: e.target.value === "on" ? true : false,
		});
	};

	// Function to handle input changes and update state accordingly
	const jobInfo = (e) => {
		setJob({
			...job,
			[e.target.name]: e.target.value,
		});
	};

	console.log("Info", info);
	console.log("permissionsInfo", permission);
	console.log("jobInfo", job);

	// Function to handle form submission
	const submit = async (e) => {
		e.preventDefault();

		await NewMaterialRequest({
			variables: {
				input: {
					name: info.name,
					items: info.items,
				},
			},
		})
			.then((res) => {
				console.log("✅ Registered user:", res.data.registerUser);
				navigate(`/user/${res.data.registerUser.id}`);
			})
			.catch((err) => {
				console.error("❌ Error registering:", err);
			});
	};

	const addSection = () => {
		setSections([...sections, { number: "" }]);
	};

	const handleInputChange = (e, index) => {
		const updatedSections = sections.map((section, secIndex) => {
			if (index === secIndex) {
				let value = e.target.value;
				if (!value) return { ...section, [e.target.name]: value };

				const phoneNumber = value.replace(/[^\d]/g, "");
				const phoneNumberLength = phoneNumber.length;

				if (phoneNumberLength <= 3) return { ...section, [e.target.name]: phoneNumber };
				if (phoneNumberLength <= 6) {
					return {
						...section,
						[e.target.name]: `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`,
					};
				}
				return {
					...section,
					[e.target.name]: `(${phoneNumber.slice(0, 3)})${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`,
				};
			}
			return section;
		});

		setSections(updatedSections);

		// Assuming you want to update the info object after formatting the phone number
		const updatedCellPhones = updatedSections.map((section) => section.number);
		setInfo({ ...info, cellPhones: updatedCellPhones });
	};

	const deleteSection = (index) => {
		const filteredSections = sections.filter((_, secIndex) => secIndex !== index);
		setSections(filteredSections);
	};

	return (
		<>
			{/* {logUser?.name} */}
			<h1>Material Request </h1>

			<div>
				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
					Log out
				</Link>
			</div>

			<div>
				<Link to={"/user/all"}>all users</Link>
			</div>
			<div>
				<Link to={""}>blank</Link>
			</div>

			<div>
				<form onSubmit={submit}>
					<div>
						<label htmlFor="addedDead">date</label>
						<input type="date" />
						{/* make the date todays date  */}
					</div>

					<div>
						<div>
							<label htmlFor="quantity">Quantity:</label>
							<input type="text" name="quantity" onChange={(e) => SubmissionInfo(e)} />
						</div>
						<span> - </span>
						<div>
							<label htmlFor="itemName">Item</label>
							<input type="text" name="itemName" onChange={(e) => SubmissionInfo(e)} />

							<select name="" id="">
								<option value=""> item</option>
								<option value="">"item 1"</option>
								<option value="">"item 2"</option>
								<option value="">"item 3"</option>
								<option value="">"item 4"</option>
								<option value="">"item 5"</option>
							</select>
						</div>
					</div>

					<div>
						<label htmlFor="color">color</label>
						<input type="text" name="color" onChange={(e) => SubmissionInfo(e)} />
						{/* <button type="button" onClick={() => setShow(!show)}>
							{show === false ? "show" : "hide"}
						</button> */}
					</div>

					<div>
						<label htmlFor="side">side/hand</label>
						<input type="text" name="side" onChange={(e) => SubmissionInfo(e)} />
						{/* <button type="button" onClick={() => setShow(!show)}>
							{show === false ? "show" : "hide"}
						</button> */}
					</div>

					<div>
						<label htmlFor="size">size</label>
						<input type="text" name="size" onChange={(e) => SubmissionInfo(e)} />
						{/* <button type="button" onClick={() => setShow(!show)}>
							{show === false ? "show" : "hide"}
						</button> */}
					</div>

					<div>
						<label htmlFor="description">Password:</label>
						<input type={show === true ? "text" : "password"} name="password" onChange={(e) => SubmissionInfo(e)} />
						<button type="button" onClick={() => setShow(!show)}>
							{show === false ? "show" : "hide"}
						</button>
					</div>

					<div className="validation"> {/* <p color="red"> {validation} </p>{" "} */}</div>
					<button type="submit" disabled={loading}>
						{loading ? "Making request  ..." : "Make Request"}
					</button>

					{error && <p style={{ color: "red" }}>{error.message}</p>}
				</form>
			</div>
		</>
	);
}
