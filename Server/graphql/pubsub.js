import "dotenv/config"; // loads .env file
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

if (process.env.REDIS_URL) {
	console.log("Using Upstash Redis PubSub via TCP");

	//  Use REDIS_URL directly
	const publisher = new Redis(process.env.REDIS_URL, {
		tls: {}, // required for secure connection
		retryStrategy: (times) => Math.min(times * 50, 2000),
	});

	const subscriber = new Redis(process.env.REDIS_URL, {
		tls: {},
		retryStrategy: (times) => Math.min(times * 50, 2000),
	});

	pubsub = new RedisPubSub({ publisher, subscriber });
} else {
	console.warn(" Using in-memory PubSub fallback");
	pubsub = new PubSub();
}

export default pubsub;

// import "dotenv/config"; // loads .env file
// import { PubSub } from "graphql-subscriptions";
// import { RedisPubSub } from "graphql-redis-subscriptions";
// import Redis from "ioredis";

// let pubsub;

// if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
// 	// Use Upstash / cloud Redis
// 	const url = process.env.UPSTASH_REDIS_URL;
// 	const token = process.env.UPSTASH_REDIS_TOKEN;
// 	const options = {
// 		url, // Upstash URL (often includes host, port, TLS, etc.)
// 		password: token,
// 		tls: {}, // Upstash often uses TLS
// 		retryStrategy: (times) => Math.min(times * 50, 2000),
// 	};
// 	const publisher = new Redis(options);
// 	const subscriber = new Redis(options);
// 	pubsub = new RedisPubSub({ publisher, subscriber });
// 	console.log(" Using cloud Redis PubSub");
// } else {
// 	// Fallback to in-memory PubSub
// 	pubsub = new PubSub();
// 	console.warn(" No cloud Redis config, using in-memory PubSub fallback");
// }

// export default pubsub;

// // pubsub.js
// import { PubSub } from "graphql-subscriptions";
// // const { PubSub } = require("graphql-subscriptions");
// const pubsub = new PubSub();
// export default pubsub;

// // pubsub.js
