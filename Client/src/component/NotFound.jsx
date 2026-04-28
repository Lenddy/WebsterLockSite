import React from "react";
import { Link } from "react-router-dom";

import { useTranslation } from "react-i18next";

function NotFound() {
	const { t } = useTranslation();
	return (
		<div>
			<div>
				<h1>{t("hello-there")}</h1>
				<h3>{t("you-lost")}</h3>
				{/* You lost need a map? how how about i help you Out this are all the directions you can go */}

				<Link to={"/material/request/all"}>{t("material-requests")}</Link>
			</div>
		</div>
	);
}

export default NotFound;
