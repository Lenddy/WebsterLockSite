// Importing necessary modules
import User from "../../models/user.model.js"; // Importing the User model
import pubsub from "../pubsub.js";
import { ApolloError } from "apollo-server-errors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
// const authenticator = require("../../middleware/tokenAuthenticator");

// Resolver object for user-related operations
const userResolver = {
	Query: {
		// Resolver for a test query
		hello: async () => {
			console.log("hello world"); // Logging "hello world"
			return "hello world"; // Returning "hello world"
		},

		// Resolver to fetch all users
		getAllUsers: async (_, __, { user }) => {
			console.log("this the token info ", user);
			if (!user) {
				throw new Error("Unauthorized: No user was found.");
			}
			if ((user.role !== "admin") | (user.role !== "subadmin")) {
				throw new Error("Unauthorized: Admin or sub admin access required.");
			}
			try {
				// Find all users in the database
				const users = await User.find();

				console.log("user making the call ", users); // Logging all users
				console.log("all the users", users); // Logging all users
				return users; // Returning all users
			} catch (error) {
				console.error("Error fetching all users", error); // Logging error if fetching fails
				throw error; // Throwing error
			}
		},

		getOneUser: async (_, { id }, { user }) => {
			try {
				// If the user is an admin, they can access any user
				if (user && (user.role === "admin") | (user.role !== "subadmin")) {
					// Admin can access any user's data
					const userToReturn = await User.findById(id);
					if (!userToReturn) {
						throw new Error("User not found"); // User not found in the database
					}
					return userToReturn;
				}

				// If the user is a normal user, they can only access their own information
				if (user && (user.userId !== id || user.email !== user.email) && user.role === "user") {
					throw new Error("Unauthorized: You can only access your own information.");
				}

				// If they are a normal user and are accessing their own information, proceed
				const userToReturn = await User.findById(id);
				if (!userToReturn) {
					throw new Error("User not found");
				}
				return userToReturn;
			} catch (error) {
				console.error("Error fetching user by ID:", error); // Logging error
				throw error; // Throw the error to the GraphQL client
			}
		},
	},

	Mutation: {
		// Resolver to create a new user
		registerUser: async (_, { registerInput: { name, email, password, confirmPassword, role = "user" } }) => {
			try {
				// Check if user already exists
				const oldUser = await User.findOne({ email });
				if (oldUser) {
					throw new ApolloError(`User with email: ${email} already exists`, "USER_ALREADY_EXIST");
				}
				if (((role !== "admin") | "subadmin", role !== "user")) {
					role = "norole";
				}

				// Create new user
				const newUser = new User({ name, email, password, confirmPassword, role });

				// Generate JWT token with role included
				const token = jwt.sign(
					{ userId: newUser.id, email, role: newUser.role }, // Include role in token payload
					process.env.Secret_Key
				);
				newUser.token = token;

				// Save user to the database
				const res = await newUser.save();

				return {
					id: res.id,
					...res._doc,
				};
			} catch (err) {
				console.error("Error registering a new user:", err);
				throw err;
			}
		},

		// Resolver to login in a user
		loginUser: async (_, { loginInput: { email, password } }) => {
			try {
				// Find the user by email in the database
				const user = await User.findOne({ email });
				console.log("this is the users id ", user.id); // Logging user's ID

				// Check if the user exists and the provided password matches the hashed password in the database
				if (user && (await bcrypt.compare(password, user.password))) {
					console.log("user and password success"); // Logging successful login

					// Generate a JWT token for the logged-in user
					const token = jwt.sign(
						{
							// Information stored in the JWT token
							user_id: user.id,
							email,
						},
						process.env.Secret_Key // Secret key used for token signing
						// {
						// 	expiresIn: "2h", // Token expiration time
						// }
					);

					// Validate the token using the authenticator middleware
					// authenticator(token);

					// Assign the generated token to the user object
					user.token = token;

					const info = {
						id: user.id,
						...user._doc, // Spread the user's document data
					};

					console.log(user); // Logging the logged-in user
					return info; // Returning the logged-in user
				} else {
					console.log("user and password fail"); // Logging failed login attempt
					throw new ApolloError("Incorrect Email OR Password", "INCORRECT_EMAIL_PASSWORD"); // Throwing error for incorrect email or password
				}
			} catch (err) {
				console.log("error logging in user", err); // Logging error if login fails
				throw err; // Throwing error
			}
		},

		// Resolver to update a user's personal information
		updateOneUserName: async (_, { id, name }, { user }) => {
			try {
				//todo: check to see if the one making the change is an admin or the same user if it is a different user or not a admin dont allow them

				// If the user is an admin, they can access any user
				if (user && user.role === "admin") {
					// Admin can access any user's data
					// Construct an update object based on the provided fields
					const update = {};
					if (name) {
						update.name = name;
					}
				}
				if (user && (user.userId !== id || user.email !== user.email) && user.role === "user") {
					throw new Error("Unauthorized: You can only access your own information.");
				}

				// Construct an update object based on the provided fields
				const update = {};
				if (name) {
					update.name = name;
				}

				// Update the user document in the database
				const updatedUser = await User.findByIdAndUpdate(id, update, { new: true });
				if (!updatedUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND"); // Throw ApolloError if user not found
				}

				// Return the updated user
				return updatedUser;
			} catch (error) {
				console.error("Error updating user's personal info:", error); // Logging error if update fails
				throw error; // Throwing error
			}
		},

		// Resolver to update a user's email
		updateEmail: async (_, { id, previousEmail, newEmail }) => {
			try {
				// Find the user by ID
				const user = await User.findById(id);
				if (!user) {
					throw new ApolloError("User not found", "USER_NOT_FOUND"); // Throw ApolloError if user not found
				}

				// Check if the previous email matches the user's current email
				if (user.email !== previousEmail) {
					throw new ApolloError("Previous email does not match", "PREVIOUS_EMAIL_MISMATCH"); // Throw ApolloError if previous email does not match
				}

				// Update the user's email
				user.email = newEmail;

				// Save the updated user
				const updatedUser = await user.save();

				// Return the updated user
				return updatedUser;
			} catch (error) {
				console.error("Error updating email:", error); // Log error if update fails
				throw error; // Throw error
			}
		},

		updateUserProfile: async (_, { id, updateUserProfile: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword } }, { user }) => {
			try {
				// makes sure that there is a user token with some basic information
				if (!user) {
					throw new Error("Unauthorized: No user context provided.");
				}

				// Find the user to be updated
				const targetUser = await User.findById(id);

				// confirms that the current users is still save in the db
				if (!targetUser) {
					throw new ApolloError("User not found", "USER_NOT_FOUND");
				}

				const isSelf = user.userId === id; //grabs the id info from the user token

				// makes sure that you are only updating you (own) personal information
				if (!isSelf) {
					throw new Error("Unauthorized: You can only update your own information.");
				}

				// Check if new email is already in use
				if (newEmail) {
					const existingUser = await User.findOne({ email: newEmail }); //tries to find a user with the email that was provided for update
					//confirms that there are no users in the db with the new email provided
					if (existingUser && existingUser.id !== id) {
						throw new ApolloError(`User with email: ${newEmail} already exists`, "USER_ALREADY_EXIST");
					}

					// confirms that a previous(current) email is provided
					if (!previousEmail) {
						throw new ApolloError("Previous email is required to update email", "EMAIL_VALIDATION_ERROR");
					}

					// confirms that the  previous(current) email provided match the email save in the db
					if (targetUser.email !== previousEmail) {
						throw new ApolloError("Previous email does not match", "PREVIOUS_EMAIL_MISMATCH");
					}
				}

				// Check if a new Password is being provided
				if (newPassword) {
					// confirms that previous(current) pass word is provided
					if (!previousPassword) {
						throw new ApolloError("Previous password is required to update your password", "PASSWORD_VALIDATION_ERROR");
					}

					// confirms that the users previous password inputted matches their password in the database
					if ((await bcrypt.compare(previousPassword, targetUser.password)) == false) {
						throw new ApolloError(`Previous password does not match your old(current) password`, "PREVIOUS_PASSWORD_MISMATCH");
					}

					// confirms that the new password and the confirms password inputted are the same
					if (newPassword !== confirmNewPassword) {
						throw new ApolloError("password and confirm Password don't match", "PASSWORD_VALIDATION_ERROR");
					}
				}
				// Update fields
				if (name) targetUser.name = name;
				if (newEmail) targetUser.email = newEmail;
				if (newPassword && confirmNewPassword) {
					targetUser.password = newPassword;
					targetUser.confirmPassword = confirmNewPassword;
				}

				//  Regenerate and save JWT token with updated data
				const newToken = jwt.sign(
					{
						userId: targetUser.id,
						email: targetUser.email,
						role: targetUser.role,
					},
					process.env.Secret_Key
				);

				targetUser.token = newToken;

				// Save updated user
				await targetUser.save();

				return targetUser;
			} catch (error) {
				console.error("Error updating user profile:", error);
				throw error;
			}
		},

		// adminChangeUserProfile: async (_, { id, updateUserProfile: { name, previousEmail, newEmail, previousPassword, newPassword, confirmNewPassword } }, { user }) => {
		// 	try {
		// 		// makes sure that there is a user token with some basic information
		// 		if (!user) {
		// 			throw new Error("Unauthorized: No user context provided.");
		// 		}

		// 		if (((user.role !== "admin") | "subadmin", role !== "user")) {
		// 			throw new Error("Unauthorized: You dont have permission to change this users information.");
		// 		}
		// 		// Find the user to be updated
		// 		const targetUser = await User.findById(id);

		// 		// confirms that the current users is still save in the db
		// 		if (!targetUser) {
		// 			throw new ApolloError("User not found", "USER_NOT_FOUND");
		// 		}

		// 		const isSelf = user.userId === id; //grabs the id info from the user token

		// 		// Check if new email is already in use
		// 		if (newEmail) {
		// 			const existingUser = await User.findOne({ email: newEmail }); //tries to find a user with the email that was provided for update
		// 			//confirms that there are no users in the db with the new email provided
		// 			if (existingUser && existingUser.id !== id) {
		// 				throw new ApolloError(`User with email: ${newEmail} already exists`, "USER_ALREADY_EXIST");
		// 			}

		// 			// confirms that a previous(current) email is provided
		// 			if (!previousEmail) {
		// 				throw new ApolloError("Previous email is required to update email", "EMAIL_VALIDATION_ERROR");
		// 			}

		// 			// confirms that the  previous(current) email provided match the email save in the db
		// 			if (targetUser.email !== previousEmail) {
		// 				throw new ApolloError("Previous email does not match", "PREVIOUS_EMAIL_MISMATCH");
		// 			}
		// 		}

		// 		// Check if a new Password is being provided
		// 		if (newPassword) {
		// 			// confirms that previous(current) pass word is provided
		// 			if (!previousPassword) {
		// 				throw new ApolloError("Previous password is required to update your password", "PASSWORD_VALIDATION_ERROR");
		// 			}

		// 			// confirms that the users previous password inputted matches their password in the database
		// 			if ((await bcrypt.compare(previousPassword, targetUser.password)) == false) {
		// 				throw new ApolloError(`Previous password does not match your old(current) password`, "PREVIOUS_PASSWORD_MISMATCH");
		// 			}

		// 			// confirms that the new password and the confirms password inputted are the same
		// 			if (newPassword !== confirmNewPassword) {
		// 				throw new ApolloError("password and confirm Password don't match", "PASSWORD_VALIDATION_ERROR");
		// 			}
		// 		}
		// 		// Update fields
		// 		if (name) targetUser.name = name;
		// 		if (newEmail) targetUser.email = newEmail;
		// 		if (newPassword && confirmNewPassword) {
		// 			targetUser.password = newPassword;
		// 			targetUser.confirmPassword = confirmNewPassword;
		// 		}

		// 		//  Regenerate and save JWT token with updated data
		// 		const newToken = jwt.sign(
		// 			{
		// 				userId: targetUser.id,
		// 				email: targetUser.email,
		// 				role: targetUser.role,
		// 			},
		// 			process.env.Secret_Key
		// 		);

		// 		targetUser.token = newToken;

		// 		// Save updated user
		// 		await targetUser.save();

		// 		return targetUser;
		// 	} catch (error) {
		// 		console.error("Error updating user profile:", error);
		// 		throw error;
		// 	}
		// },

		deleteOneUser: async (_, { id }, { user }) => {
			console.log("this is the token", user);
			if (!user || user.role !== "admin") {
				throw new Error("Unauthorized: Admin access required.");
			}

			return await User.findByIdAndDelete(id);
		},
	},

	Subscription: {
		// Subscription resolver
		onChange: {
			// Subscribe to certain events
			subscribe: () => pubsub.asyncIterableIterator(["USER_ADDED", "USER_UPDATED", "USER_DELETED"]),
		},
	},

	// Resolver for custom fields
	User: {
		createdAt: (user) => user.createdAt.toISOString(), // Format createdAt field
		updatedAt: (user) => user.updatedAt.toISOString(), // Format updatedAt field
	},
};

export { userResolver }; // Export the resolver
