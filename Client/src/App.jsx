import "./App.css";
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Test from "./component/Test";
import ProtectedRoute from "./component/ProtectedRoutes";
import LogIn from "./component/users/LogIn";
import RegisterUser from "./component/users/registerUser";
import GetAllUsers from "./component/users/GetAllUsers";
import GetOneUser from "./component/users/GetOneUser";
import GetAllMaterialRequest from "./component/material_requests/GetAllMaterialRequest";
import GetOneMaterialRequest from "./component/material_requests/GetOneMaterialRequest";

function App() {
	return (
		<>
			<Routes>
				<Route index element={<LogIn />} />
				<Route element={<ProtectedRoute />}>
					<Route path="/user/all" element={<GetAllUsers />} />
					<Route path="/user/:userId/update?/admin?" element={<GetOneUser />} />
					<Route path="/user/register" element={<RegisterUser />} />
					<Route path="/material/request/all" element={<GetAllMaterialRequest />} />
					<Route path="/material/request/:requestId/update?" element={<GetOneMaterialRequest />} />

					<Route path="/test" element={<Test />} />
				</Route>
			</Routes>
		</>
	);
}

export default App;
