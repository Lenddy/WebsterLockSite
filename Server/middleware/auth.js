// Importing AuthenticationError for handling authentication errors
import { AuthenticationError } from "apollo-server-errors";

// Importing jsonwebtoken for token verification
import jwt from "jsonwebtoken";

// Exporting a function that takes the context object as a parameter
export default (context) => {
	// Extracting the authorization header from the context
	const authHeader = context.req.header.authorization;
	// console.log(process.env.Secret_Key);
	// Checking if the authorization header exists
	if (authHeader) {
		// Extracting the token from the authorization header
		const token = authHeader.split("Bearer")[1];

		// Checking if the token exists
		if (token) {
			try {
				// Verifying the token using the secret key ("UNSAFE_STRING")
				const user = jwt.verify(token, process.env.Secret_Key);

				// Returning the decoded user object if the token is valid
				return user;
			} catch (err) {
				// Throwing an AuthenticationError if the token is invalid or expired
				throw new AuthenticationError("Invalid/Expired token");
			}
		}

		// Throwing an error if the token is missing
		throw new Error("Authentication token must be 'Bearer [token]'");
	}

	// Throwing an error if the authorization header is missing
	throw new Error("Authentication must be provided");
};
