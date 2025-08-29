import "./App.css";
import { useState } from "react";
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

import AdminRegisterMultipleUsers from "./component/users/Admin/AdminRegisterMultipleUsers";
import AdminUpdateMultipleUsers from "./component/users/Admin/AdminUpdateMultipleUsers";

function App({ userToke }) {
	return (
		<>
			<Routes>
				<Route index element={<LogIn />} />

				<Route element={<ProtectedRoute />}>
					{/* Admin user routes */}
					<Route path="/user/admin/register" element={<AdminRegisterMultipleUsers userToke={userToke} />} />
					<Route path="/user/admin/update" element={<AdminUpdateMultipleUsers />} />

					{/* User routes */}
					<Route path="/user/all" element={<GetAllUsers />} />
					<Route path="/user/:userId/update?/admin?" element={<GetOneUser />} />
					<Route path="/user/register" element={<RegisterUser />} />

					{/* Material request routes */}
					<Route path="/material/request/all" element={<GetAllMaterialRequest />} />
					<Route path="/material/request/:requestId/update?" element={<GetOneMaterialRequest />} />
					<Route path="/material/request/request" element={<CreateOneMaterialRequest />} />

					<Route path="/test" element={<Test />} />
				</Route>
			</Routes>
		</>
	);
}

export default App;
