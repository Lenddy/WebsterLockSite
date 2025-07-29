// Importing necessary modules
const User = require("../../models/user.model"); // Importing the User model
const { v4: uuidv4 } = require("uuid"); // Importing UUID for generating unique IDs
const pubsub = require("../pubsub"); // Importing pubsub for subscriptions

const { ApolloError } = require("apollo-server-errors");

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt"); // Module for hashing passwords

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
			if (!user || user.role !== "admin") {
				throw new Error("Unauthorized: Admin access required.");
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
				if (user && user.role === "admin") {
					// Admin can access any user's data
					const userToReturn = await User.findById(id);
					if (!userToReturn) {
						throw new Error("User not found"); // User not found in the database
					}
					return userToReturn;
				}

				// If the user is a normal user, they can only access their own information
				// if(user && user.role === "user"){

				// }
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
		// registerUser: async (_, { registerInput: { name, email, password, confirmPassword } }) => {
		// 	const createdAt = new Date().toISOString(); // Use toISOString() for custom DateTime scalar
		// 	const updatedAt = new Date().toISOString(); // Use toISOString() for custom DateTime scalar

		// 	const addedUser = { name, email, password, confirmPassword, createdAt, updatedAt };
		// 	console.log("new user info", addedUser);
		// 	try {
		// 		const oldUser = await User.findOne({ email }); // Find existing user with the provided email
		// 		if (oldUser) {
		// 			throw new ApolloError(`user with email: ${email} is already register`, "USER_ALREADY_EXIST"); // Throw error if user already exists
		// 		}

		// 		// Create a new User object with the provided details
		// 		const newUser = new User(addedUser);

		// 		// Generate a JWT token for the new user
		// 		const token = jwt.sign(
		// 			{
		// 				//information store in the jwt token
		// 				userId: newUser.id,
		// 				email,
		// 			},
		// 			process.env.Secret_Key
		// 			// {
		// 			// 	expiresIn: "2h", // Token expiration time
		// 			// }
		// 		);

		// 		newUser.token = token; // Assign the generated token to the newUser object
		// 		authenticator(token);
		// 		// Save the newly created user to the database
		// 		const res = await newUser.save();
		// 		const info = {
		// 			id: res.id,
		// 			...res._doc,
		// 		};

		// 		console.log(newUser); // Logging the newly created user
		// 		return info; // Returning the newly created user
		// 	} catch (err) {
		// 		console.log("error registering a new user", err); // Logging error if creation fails
		// 		throw err; // Throwing error
		// 	}
		// },

		registerUser: async (_, { registerInput: { name, email, password, confirmPassword, role = "user" } }) => {
			try {
				// Check if user already exists
				const oldUser = await User.findOne({ email });
				if (oldUser) {
					throw new ApolloError(`User with email: ${email} already exists`, "USER_ALREADY_EXIST");
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

		// Resolver to log in a user
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
					throw new ApolloError("Incorrect Password", "INCORRECT_PASSWORD"); // Throwing error for incorrect password
				}
			} catch (err) {
				console.log("error logging in user", err); // Logging error if login fails
				throw err; // Throwing error
			}
		},

		// Resolver to update a user's personal information
		updateOneUserName: async (_, { id, name }) => {
			try {
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

		// Resolver to delete a user by ID
		// deleteOneUser: async (_, { id }) => {
		// 	try {
		// 		// Find the user by ID and delete it
		// 		const deletedUser = await User.findByIdAndDelete(id);
		// 		if (!deletedUser) {
		// 			throw new ApolloError("User not found", "USER_NOT_FOUND"); // Throw ApolloError if user not found
		// 		}

		// 		// Return the deleted user
		// 		return deletedUser;
		// 	} catch (error) {
		// 		console.error("Error deleting user:", error); // Logging error if deletion fails
		// 		throw error; // Throwing error
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
			subscribe: () => pubsub.asyncIterator(["USER_ADDED", "USER_UPDATED", "USER_DELETED"]),
		},
	},

	// Resolver for custom fields
	User: {
		createdAt: (user) => user.createdAt.toISOString(), // Format createdAt field
		updatedAt: (user) => user.updatedAt.toISOString(), // Format updatedAt field
	},
};

module.exports = { userResolver }; // Export the resolver
