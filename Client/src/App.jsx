import "./App.css";
import { Routes, Route } from "react-router-dom";
import Test from "./component/Test";
import { useState } from "react";
import RegisterUser from "./component/users/registerUser";
import LogIn from "./component/users/LogIn";

function App() {
	return (
		<>
			<Routes>
				<Route index element={<LogIn />} />
				<Route path="/register" element={<RegisterUser />} />

				<Route path="/test" element={<Test />} />
			</Routes>
		</>
	);
}

export default App;
