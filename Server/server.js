// Core imports
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// Apollo Server (v4) and GraphQL
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { mergeTypeDefs, mergeResolvers } = require("@graphql-tools/merge");
const { useServer } = require("graphql-ws/lib/use/ws");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const bodyParser = require("body-parser");

// Authentication and schema logic
const authenticator = require("./server/middleware/tokenAuthenticator");

const { managerTypeDef } = require("./server/graphql/types/manager.typeDef");
const { managerResolvers } = require("./server/graphql/resolvers/manager.resolver");
const { userTypeDef } = require("./server/graphql/types/user.typeDef");
const { userResolver } = require("./server/graphql/resolvers/user.resolver");

// Merge GraphQL schema
const typeDefs = mergeTypeDefs([managerTypeDef, userTypeDef]);
const resolvers = mergeResolvers([managerResolvers, userResolver]);
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
						return { user };
					} catch (err) {
						console.error("Auth error:", err.message);
						throw new Error("Invalid or expired token");
					}
				}
				return {};
			},
		})
	);

	// Connect to MongoDB
	await require("./server/config/config");

	// Start server
	const PORT = process.env.PORT || 4000;
	httpServer.listen(PORT, () => {
		console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
		console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`);
	});
};

startServer();
