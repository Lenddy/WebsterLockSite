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
import GetOneItemUsage from "./component/Admin/item_Groups/GetOneItemUsage";

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

	useEffect(() => {
		const handleResize = () => setScreenWidth(window.innerWidth);
		window.addEventListener("resize", handleResize);

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<div className="app">
			{/* //SECTION - Routes  */}
			{/* //NOTE  the route from the update profile should be avoided  */}
			{/* //NOTE - Routes that need to be secured from none admins /admin/user/register , /admin/user/userId/update , /admin/material/request , /admin/material/item/all , /admin/material/item/create , /admin/material/item/:itemId* , /admin/material/item/:itemId?/update , /admin/material/item/usage , /user/all , /user/:userId/update?/admin? , /user/register , /admin/material/item/usage/:name  */}
			{/* //NOTE for route /material/request/:requestId/ , /material/request/:requestId/update?  there needs to be  a material id  and if not an admin it needs to the owner of the request   */}

			<Routes>
				<Route index element={<LogIn screenWidth={screenWidth} />} />
				//LINK - /test
				<Route path="/test" element={<Test screenWidth={screenWidth} />} />
				<Route element={<ProtectedRoute screenWidth={screenWidth} />}>
					{/* Admin User routes */}
					//LINK - /admin/user/register
					<Route path="/admin/user/register" element={<AdminRegisterMultipleUsers />} />
					//LINK - /admin/user/:userId?/update
					<Route path="/admin/user/:userId?/update" element={<AdminUpdateMultipleUsers />} />
					{/* Admin Material request routes */}
					//LINK - /admin/material/request
					<Route path="/admin/material/request" element={<AdminCreateMultipleMaterialRequests />} />
					{/*{/* Admin item groups */}
					//LINK - /admin/material/item/all
					<Route path="/admin/material/item/all" element={<AdminGetAllItems />} />
					//LINK - /admin/material/item/create
					<Route path="/admin/material/item/create" element={<AdminCreateMultipleItemsGroups />} />
					//LINK - /admin/material/item/:itemId
					<Route path="/admin/material/item/:itemId" element={<AdminGetOneItem />} />
					//LINK - /admin/material/item/:itemId?/update
					<Route path="/admin/material/item/:itemId?/update" element={<AdminUpdateMultipleItemsGroups />} />
					//LINK - /admin/material/item/usage
					<Route path="/admin/material/item/usage" element={<AdminItemUsage />} />
					{/* User routes */}
					//LINK - /user/all
					<Route path="/user/all" element={<GetAllUsers />} />
					//LINK - /user/:userId/update?/admin?
					<Route path="/user/:userId/update?/admin?" element={<GetOneUser />} />
					//LINK - /user/register
					<Route path="/user/register" element={<RegisterUser />} />
					{/* Material request routes */}
					//LINK - /material/request/all
					<Route path="/material/request/all" element={<GetAllMaterialRequest />} />
					//LINK - /material/request/:requestId/update?
					<Route path="/material/request/:requestId/update?" element={<GetOneMaterialRequest />} />
					//LINK - /material/request/request
					<Route path="/material/request/request" element={<CreateOneMaterialRequest />} />
					//LINK - /admin/material/item/usage/:name
					<Route path="/admin/material/item/usage/:name" element={<GetOneItemUsage />} />
					{/* <Route path="/test" element={<Test />} /> */}
					<Route path="*" element={<NotFound to="/404" replace />} />
				</Route>
			</Routes>
		</div>
		//!SECTION - /admin/material/request
	);
}

export default App;
