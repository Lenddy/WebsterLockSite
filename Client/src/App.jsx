import "./App.css";
import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Test from "./component/Test";
import ProtectedRoute from "./component/ProtectedRoutes";
import LogIn from "./component/users/LogIn";
import RegisterUser from "./component/users/RegisterUser";
import GetAllUsers from "./component/users/GetAllUsers";
import GetOneUser from "./component/users/GetOneUser";
import GetAllMaterialRequest from "./component/material_requests/GetAllMaterialRequest";
import GetOneMaterialRequest from "./component/material_requests/GetOneMaterialRequest";
import CreateOneMaterialRequest from "./component/material_requests/CreateOneMaterialRequest";

import AdminRegisterMultipleUsers from "./component/Admin/AdminRegisterMultipleUsers";
import AdminUpdateMultipleUsers from "./component/Admin/AdminUpdateMultipleUsers";
import AdminCreateMultipleMaterialRequests from "./component/Admin/AdminCreateMultipleMaterialRequests";
import AdminGetAllItems from "./component/Admin/AdminGetAllItems";
import AdminGetOneItem from "./component/Admin/AdminGetOneItem";
import AdminCreateMultipleItemsGroups from "./component/Admin/AdminCreateMultipleItemGroups";
import AdminUpdateMultipleItemsGroups from "./component/Admin/AdminUpdateMultipleItemGroups";
import AdminItemUsage from "./component/Admin/AdminItemUsage";

function App({ userToken }) {
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);

	useEffect(() => {
		const handleResize = () => setScreenWidth(window.innerWidth);
		window.addEventListener("resize", handleResize);

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<div className="app">
			<Routes>
				<Route index element={<LogIn screenWidth={screenWidth} />} />

				<Route element={<ProtectedRoute screenWidth={screenWidth} />}>
					{/* Admin user routes */}
					<Route path="/admin/user/register" element={<AdminRegisterMultipleUsers userToken={userToken} />} />
					<Route path="/admin/user/:userId?/update" element={<AdminUpdateMultipleUsers />} />
					<Route path="/admin/material/request" element={<AdminCreateMultipleMaterialRequests />} />
					<Route path="/admin/material/item/all" element={<AdminGetAllItems />} />
					<Route path="/admin/material/item/:itemId" element={<AdminGetOneItem />} />
					<Route path="/admin/material/item/create" element={<AdminCreateMultipleItemsGroups />} />
					<Route path="/admin/material/item/update" element={<AdminUpdateMultipleItemsGroups />} />
					<Route path="/admin/material/item/usage" element={<AdminItemUsage />} />

					{/* User routes */}
					<Route path="/user/all" element={<GetAllUsers userToken={userToken} />} />
					<Route path="/user/:userId/update?/admin?" element={<GetOneUser userToken={userToken} />} />
					<Route path="/user/register" element={<RegisterUser />} />

					{/* Material request routes */}
					<Route path="/material/request/all" element={<GetAllMaterialRequest />} />
					<Route path="/material/request/:requestId/update?" element={<GetOneMaterialRequest userToken={userToken} />} />
					<Route path="/material/request/request" element={<CreateOneMaterialRequest />} />
					<Route path="/test" element={<Test />} />
				</Route>
			</Routes>
		</div>
	);
}

export default App;
