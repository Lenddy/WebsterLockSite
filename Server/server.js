// Core imports
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

// Apollo Server (v5) and GraphQL
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { useServer } from "graphql-ws/use/ws"; // later on you might need to import graphql-ws/lib/use/ws //i remove lib because it was giving an error  not allowing me to use the import

// const { useServer } = await import("graphql-ws/lib/use/ws");

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

// Async startup function
const startServer = async () => {
	const app = express();
	const httpServer = createServer(app);

	// WebSocket server for subscriptions
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: "/graphql",
	});

	// Use graphql-ws for subscriptions
	useServer({ schema }, wsServer);

	// Apollo Server v4
	const apolloServer = new ApolloServer({
		schema,
		introspection: true,
	});

	await apolloServer.start();

	// Apollo middleware
	app.use(
		"/graphql",
		cors(),
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

	// Start server
	const PORT = process.env.PORT || 4000;
	httpServer.listen(PORT, () => {
		console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
		console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`);
	});
};

startServer();
