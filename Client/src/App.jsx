import "./App.css";
import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Test from "./component/Test";
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

import NotFound from "./component/NotFound";

function App({ client }) {
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
