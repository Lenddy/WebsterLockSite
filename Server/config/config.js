// const { mongoose } = require("mongoose");
import { mongoose } from "mongoose"; // Import mongoose for MongoDB
import "dotenv/config"; // Load environment variables from the .env file
// dotenv.config();
// require("dotenv").config(); // Load environment variables from the .env file

mongoose.set("strictQuery", true); // Enable strict query mode for mongoose (only the defined fields will be saved in the schema)
mongoose
	.connect(
		// `mongodb+srv://${process.env.DB_USER_DEV}:${process.env.DB_PASS_DEV}@cluster0.tddgfzo.mongodb.net/${process.env.DB_NAME_DEV}?retryWrites=true&w=majority&appName=Cluster0`

		process.env.DB_CONNECTION

		// `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dgnvl.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
		// Connect to MongoDB using credentials from .env (DB_USER, DB_PASS, and DB_NAME)
	)
	.then((c) => console.log("Established a connection to the database")) // Success message on connection
	.catch((err) => console.log("Something went wrong when connecting to the database ", err));
// Error handling if the connection fails
