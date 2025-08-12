import { register_User } from "../../../graphQL/mutations/mutations";
import { useMutation } from "@apollo/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterUser() {
	const [info, setInfo] = useState({});
	const navigate = useNavigate();
	const [registerUser] = useMutation(register_User);

	// Function to handle input changes and update state accordingly
	const SubmissionInfo = (e) => {
		setInfo({
			...info,
			[e.target.name]: e.target.value,
		});
	};

	// Function to handle form submission
	const submit = async (e) => {
		e.preventDefault();

		await registerUser({
			variables: {
				input: {
					name: info.name,
					email: info.email,
					password: info.password,
					confirmPassword: info.confirmPassword,
					role: info.role,
					job: {
						title: info.jobTitle,
						description: info.jobDescription,
					},
					permissions: {
						canEditUsers: info.canEditUsers || false,
						canDeleteUsers: info.canDeleteUsers || false,
						canChangeRole: info.canChangeRole || false,
						canViewUsers: info.canViewUsers || false,
						canViewAllUsers: info.canViewAllUsers || false,
						canEditSelf: info.canEditSelf || true,
						canViewSelf: info.canViewSelf || true,
						canDeleteSelf: info.canDeleteSelf || false,
					},
				},
			},
		})
			.then((res) => {
				console.log("✅ Registered user:", res.data.registerUser);
				navigate(`/users/${res.data.registerUser.id}`);
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
			<div>registerUser</div>
			<div className="test">sdfksdl;f</div>
		</>
	);
}
