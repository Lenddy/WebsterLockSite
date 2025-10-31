// pubsub.js
import "dotenv/config";
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

// let pubsub;

// // --- Keep in-memory fallback by default
// pubsub = new PubSub();

// // --- Only try Redis if URL is present
// if (process.env.REDIS_URL) {
// 	console.log("✅ Attempting Redis PubSub connection");

// 	const redisOptions = {
// 		retryStrategy: (times) => Math.min(times * 200, 3000),
// 		reconnectOnError: (err) => /READONLY|ECONNRESET|ETIMEDOUT/.test(err.message),
// 	};

// 	const publisher = new Redis(process.env.REDIS_URL, redisOptions);
// 	const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

// 	// --- Log status for debug
// 	[publisher, subscriber].forEach((client, i) => {
// 		const label = i === 0 ? "Publisher" : "Subscriber";
// 		client.on("connect", () => console.log(`✅ ${label} connected to Redis`));
// 		client.on("ready", () => console.log(`🚀 ${label} ready`));
// 		client.on("error", (err) => console.error(`❌ ${label} Redis error:`, err.message));
// 		client.on("close", () => console.warn(`🔌 ${label} connection closed`));
// 		client.on("reconnecting", () => console.warn(`🔁 ${label} reconnecting...`));
// 	});

// 	// --- Test Redis ping
// 	(async () => {
// 		try {
// 			const pong = await publisher.ping();
// 			console.log(`📡 Redis ping response: ${pong}`);
// 		} catch (err) {
// 			console.error("🚨 Redis ping failed:", err.message);
// 		}
// 	})();

// 	// --- Replace the in-memory pubsub with RedisPubSub
// 	pubsub = new RedisPubSub({ publisher, subscriber });

// 	// --- Optional: test publish/subscribe
// 	(async () => {
// 		const TEST_CHANNEL = "connection_test_channel";

// 		const subIterator = await pubsub.asyncIterator(TEST_CHANNEL);
// 		(async () => {
// 			for await (const payload of subIterator) {
// 				console.log("📨 Received message from Redis PubSub:", payload);
// 			}
// 		})();

// 		setTimeout(async () => {
// 			const message = { msg: "Hello from Redis PubSub test!" };
// 			await pubsub.publish(TEST_CHANNEL, message);
// 			console.log("🚀 Published test message to Redis PubSub:", message);
// 		}, 2000);
// 	})();
// }

// export default pubsub;

// !!!! old pub sub code (does not works on render at the moment )

import "dotenv/config"; // loads .env file
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

if (process.env.REDIS_URL && process.env.BUILD) {
	console.log("Using Upstash Redis PubSub via TCP");
	console.log("ignore fore now ");

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

// Connect to your Key Value instance using the REDIS_URL environment variable
// The REDIS_URL is set to the internal connection URL e.g. redis://red-343245ndffg023:6379
const redis = new Redis(process.env.REDIS_URL);

// Set and retrieve some values
await redis.set("key", "ioredis");
const result = await redis.get("key");
console.log("this is from the example ", result);
