// const jwt = require("jsonwebtoken");

// // Sample JWT token

// const authenticator = async (token) => {
// 	// Verify and decode the token=
// 	jwt.verify(token, process.env.Secret_Key, (err, decodedToken) => {
// 		if (err) {
// 			console.error("Error decoding token:", err.message);
// 		} else {
// 			// Extracted data from the token's payload
// 			const userData = decodedToken;
// 			console.log("Decoded token data:", userData);
// 		}
// 	});
// };

// module.exports = authenticator;

const jwt = require("jsonwebtoken");

const authenticator = async (token) => {
	// const timestamp = new Date().toISOString();
	// console.log(`Authenticator called at ${timestamp}`);

	if (!token) {
		throw new Error("Authentication token is missing.");
	}

	try {
		const decodedToken = jwt.verify(token, process.env.Secret_Key);

		// if (process.env.NODE_ENV !== "production") {
		// 	console.log(`Decoded token data at ${timestamp}:`, decodedToken);
		// }

		return decodedToken;
	} catch (err) {
		console.error("Error decoding token:", err.message);
		throw new Error("Invalid or expired token.");
	}
};

module.exports = authenticator;
