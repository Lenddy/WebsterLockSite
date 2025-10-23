import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
	return (
		<div>
			<div>
				<h1> heeeeyyy thereeeeeee </h1>
				<h3>You lost need a map? how how about i help you Out this are all the directions you can go </h3>

				<Link to={"/material/request/all"}> Material Request </Link>
			</div>
		</div>
	);
}

export default NotFound;
