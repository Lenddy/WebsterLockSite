import "./App.css";
import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Test from "./component/Test";
import { usePrivacyGuard } from "./context/privacyGuard";

import ProtectedRoute from "./component/ProtectedRoutes";
import LogIn from "./component/users/LogIn";

// admin users
import AdminRegisterMultipleUsers from "./component/Admin/users/AdminRegisterMultipleUsers";
import AdminUpdateMultipleUsers from "./component/Admin/users/AdminUpdateMultipleUsers";

// admin material-request
import AdminCreateMultipleMaterialRequests from "./component/Admin/material_request/AdminCreateMultipleMaterialRequests";

// admin item Groups
import AdminGetAllItems from "./component/Admin/item_Groups/AdminGetAllItems";
import AdminGetOneItem from "./component/Admin/item_Groups/AdminGetOneItem";
import AdminCreateMultipleItemsGroups from "./component/Admin/item_Groups/AdminCreateMultipleItemGroups";
import AdminUpdateMultipleItemsGroups from "./component/Admin/item_Groups/AdminUpdateMultipleItemGroups";
import AdminItemUsage from "./component/Admin/item_Groups/AdminItemUsage";

// regular
import RegisterUser from "./component/users/RegisterUser";
import GetAllUsers from "./component/users/GetAllUsers";
import GetOneUser from "./component/users/GetOneUser";
import GetAllMaterialRequest from "./component/material_requests/GetAllMaterialRequest";
import GetOneMaterialRequest from "./component/material_requests/GetOneMaterialRequest";
import CreateOneMaterialRequest from "./component/material_requests/CreateOneMaterialRequest";

// import NavBar from "./component/NavBar";

import NotFound from "./component/NotFound";

function App() {
	console.log(window.location.hostname);
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);

	// const { anyPrivacyBlocker, shieldsActive, brave, checked, recheck, test } = usePrivacyGuard();

	// console.log("anyPrivacyBlocker:", anyPrivacyBlocker, "\n", "\n", "brave:", brave, "\n", "checked:", checked, "\n", "recheck:", recheck);
	// // "shieldsActive:", shieldsActive

	useEffect(() => {
		const handleResize = () => setScreenWidth(window.innerWidth);
		window.addEventListener("resize", handleResize);

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// useEffect(() => {
	// 	if (checked && anyPrivacyBlocker) {
	// 		// 	// Disable all clicking on page
	// 		// 	document.body.style.pointerEvents = "none";
	// 		// }
	// 		// if (checked && anyPrivacyBlocker) {
	// 		// if ((test, brave)) {
	// 		// Disable all clicking on page
	// 		document.body.style.pointerEvents = "none";
	// 	}
	// }, [checked, anyPrivacyBlocker, test, brave]);

	// if (!checked) return null; // or a loader

	// document.body.style.pointerEvents = "none";

	return (
		<div className="app">
			{/* {test && brave && ( */}
			{/* {anyPrivacyBlocker && (
				<div
					style={{
						background: "red",
						color: "white",
						padding: "20px",
						textAlign: "center",
						position: "fixed",
						top: 0,
						width: "100%",
						zIndex: 9999,
					}}>
					<h3>⚠ Privacy Blocking Detected</h3>

					{brave && shieldsActive && <p>Brave Shields are blocking WebSockets. Disable Shields and reload.</p>}

					{!brave && shieldsActive && <p>Your privacy settings are blocking WebSockets. Please disable tracker-blocking for this site and reload.</p>}

					<p> you wont be able to access anything until you do </p>

					<button
						onClick={() => {
							console.log("privacy click"), recheck();
						}}
						style={{ padding: "10px 20px", pointerEvents: "all", cursor: "pointer" }}>
						Recheck
					</button>
				</div>
			)} */}

			<Routes>
				<Route index element={<LogIn screenWidth={screenWidth} />} />
				<Route path="/test" element={<Test screenWidth={screenWidth} />} />

				<Route element={<ProtectedRoute screenWidth={screenWidth} />}>
					{/* Admin User routes */}
					<Route path="/admin/user/register" element={<AdminRegisterMultipleUsers />} />
					<Route path="/admin/user/:userId?/update" element={<AdminUpdateMultipleUsers />} />

					{/* Admin Material request routes */}
					<Route path="/admin/material/request" element={<AdminCreateMultipleMaterialRequests />} />

					{/* Admin item groups */}
					<Route path="/admin/material/item/all" element={<AdminGetAllItems />} />
					<Route path="/admin/material/item/create" element={<AdminCreateMultipleItemsGroups />} />
					<Route path="/admin/material/item/:itemId" element={<AdminGetOneItem />} />
					<Route path="/admin/material/item/:itemId?/update" element={<AdminUpdateMultipleItemsGroups />} />
					<Route path="/admin/material/item/usage" element={<AdminItemUsage />} />

					{/* User routes */}
					<Route path="/user/all" element={<GetAllUsers />} />
					<Route path="/user/:userId/update?/admin?" element={<GetOneUser />} />
					<Route path="/user/register" element={<RegisterUser />} />

					{/* Material request routes */}
					<Route path="/material/request/all" element={<GetAllMaterialRequest />} />
					<Route path="/material/request/:requestId/update?" element={<GetOneMaterialRequest />} />
					<Route path="/material/request/request" element={<CreateOneMaterialRequest />} />
					{/* <Route path="/test" element={<Test />} /> */}

					<Route path="*" element={<NotFound to="/404" replace />} />
				</Route>
			</Routes>
		</div>
	);
}

export default App;
