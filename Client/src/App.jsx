import "./App.css";
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Test from "./component/Test";
import ProtectedRoute from "./component/ProtectedRoutes";
import LogIn from "./component/users/LogIn";
import RegisterUser from "./component/users/registerUser";
import GetAllUsers from "./component/users/GetAllUsers";
import GetOneUsers from "./component/users/GetOneUsers";

function App() {
	return (
		<>
			<Routes>
				<Route index element={<LogIn />} />
				<Route element={<ProtectedRoute />}>
					<Route path="/allUsers" element={<GetAllUsers />} />
					<Route path="/user/:userId" element={<GetOneUsers />} />
					<Route path="/registerUser" element={<RegisterUser />} />
					<Route path="/test" element={<Test />} />
				</Route>
			</Routes>
		</>
	);
}

export default App;
