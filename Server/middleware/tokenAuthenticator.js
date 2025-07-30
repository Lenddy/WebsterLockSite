// tokenAuthenticator.js
import jwt from "jsonwebtoken";

const authenticator = async (token) => {
	if (!token) {
		throw new Error("Authentication token is missing.");
	}

	try {
		const decodedToken = jwt.verify(token, process.env.Secret_Key);
		return decodedToken;
	} catch (err) {
		console.error("Error decoding token:", err.message);
		throw new Error("Invalid or expired token.");
	}
};

export default authenticator;
