// Core imports
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import dotenv from "dotenv";
dotenv.config();

// Apollo Server (v5) and GraphQL
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import cors from "cors";
import bodyParser from "body-parser";

// Authentication and schema logic
import authenticator from "./middleware/tokenAuthenticator.js";
import pubsub from "./graphql/pubsub.js";

// GraphQL Types & Resolvers
import { userTypeDef } from "./graphql/types/user.typeDef.js";
import { userResolver } from "./graphql/resolvers/user.resolver.js";
import { materialRequestTypeDef } from "./graphql/types/materialRequest.typeDef.js";
import { materialRequestResolvers } from "./graphql/resolvers/materialRequest.resolver.js";
import { itemGroupTypeDef } from "./graphql/types/itemsGroup.typeDef.js";
import { itemGroupResolver } from "./graphql/resolvers/itemGroup.resolver.js";

// Merge GraphQL schema
const typeDefs = mergeTypeDefs([userTypeDef, materialRequestTypeDef, itemGroupTypeDef]);
const resolvers = mergeResolvers([userResolver, materialRequestResolvers, itemGroupResolver]);
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Define __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Async startup function
const startServer = async () => {
	const app = express();
	const httpServer = createServer(app);

	// 1) CORS middleware
	app.use(
		cors({
			origin: [
				"https://webster-lock-material-requests.onrender.com",
				"https://webster-lock-material-requests-test.onrender.com",
				"http://localhost:5173",
				"http://localhost:3000",
				// "https://privacy-test-pages.glitch.me/tracking/trackers.js"
				// "https://cors-test.codehappy.dev/ok.txt",
				,
			],
			credentials: true,
		})
	);

	// 2) Serve i18next translations
	app.use("/locales", express.static(path.join(__dirname, "locales")));

	// 3) WebSocket server for subscriptions
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: "/graphql",
	});

	wsServer.on("error", (error) => {
		console.error(`WebSocket server error:  ${error}`.black.bgRed);
	});

	useServer(
		{
			schema,
			context: async (ctx, msg) => {
				const token = ctx.connectionParams?.authorization?.split(" ")[1];
				if (token) {
					try {
						const user = await authenticator(token);
						return { user, pubsub };
					} catch (err) {
						console.error("WS auth error:", err.message);
						return { pubsub };
					}
				}
				return { pubsub };
			},
		},
		wsServer
	);

	// 4) Apollo Server
	const apolloServer = new ApolloServer({
		schema,
		introspection: true,
	});

	await apolloServer.start();

	app.use(
		"/graphql",
		cors(), // CORS for HTTP GraphQL
		bodyParser.json(),
		expressMiddleware(apolloServer, {
			context: async ({ req }) => {
				const token = req.headers.authorization?.split(" ")[1];
				if (token) {
					try {
						const user = await authenticator(token);
						return { user, pubsub };
					} catch (err) {
						console.error("Auth error:", err.message);
						throw new Error("Invalid or expired token");
					}
				}
				return { pubsub };
			},
		})
	);

	// Connect to MongoDB (ESM dynamic import)
	await import("./config/config.js");

	const { seedAdmin } = await import("./seed.js");
	await seedAdmin();

	// Start server
	const PORT = process.env.PORT || 4000;
	httpServer.listen(PORT, () => {
		console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
		console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`);
	});
	app.listen(3005);
};

startServer();
