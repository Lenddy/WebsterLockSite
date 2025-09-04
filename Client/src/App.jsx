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

import AdminRegisterMultipleUsers from "./component/Admin/AdminRegisterMultipleUsers";
import AdminUpdateMultipleUsers from "./component/Admin/AdminUpdateMultipleUsers";
import AdminCreateMultipleMaterialRequests from "./component/Admin/AdminCreateMultipleMaterialRequests";
import AdminGetAllItems from "./component/Admin/AdminGetAllItems";
import AdminGetOneItem from "./component/Admin/AdminGetOneItem";
import AdminCreateMultipleItemsGroups from "./component/Admin/AdminCreateMultipleItemGroups";
import AdminUpdateMultipleItemsGroups from "./component/Admin/AdminUpdateMultipleItemGroups";

function App({ userToke }) {
	{
		/* <div>
				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
					Log out
				</Link>
			</div>

			<div>
				<Link to={"/admin/user/register"}>admin register users</Link>
			</div>

			<div>
				<Link to={"/admin/user/update"}>admin update users</Link>
			</div>

			<div>
				<Link to={"/admin/material/request/"}>admin create material requests</Link>
			</div>

			<div>
				<Link to={"/admin/material/request/"}>admin create material requests</Link>
			</div>
			<div>
				<Link to={"/admin/material/item/all"}>all items</Link>
			</div>

			<div>
				<Link to={"/admin/material/item/create"}>admin create items</Link>
			</div>

			<div>
				<Link to={"/admin/material/item/update"}>admin update items</Link>
			</div>

			<div>
				<Link to={"/user/register"}>register user</Link>
			</div>

			<div>
				<Link to={`/material/request/all`}>all material requests</Link>
			</div> */
	}

	return (
		<div className="app">
			<Routes>
				<Route index element={<LogIn />} />

				<Route element={<ProtectedRoute />}>
					{/* Admin user routes */}
					<Route path="/admin/user/register" element={<AdminRegisterMultipleUsers userToke={userToke} />} />
					<Route path="/admin/user/update" element={<AdminUpdateMultipleUsers />} />
					<Route path="/admin/material/request/" element={<AdminCreateMultipleMaterialRequests />} />
					<Route path="/admin/material/item/all" element={<AdminGetAllItems />} />
					<Route path="/admin/material/item/:itemId" element={<AdminGetOneItem />} />
					<Route path="/admin/material/item/create" element={<AdminCreateMultipleItemsGroups />} />
					<Route path="/admin/material/item/update" element={<AdminUpdateMultipleItemsGroups />} />

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
		</div>
	);
}

export default App;
