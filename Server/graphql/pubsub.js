import "dotenv/config";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

// --- Redis connection options
const redisOptions = {
	// Render KV requires TLS for secure connection
	tls: {},

	// Reconnect strategy
	retryStrategy: (times) => {
		const delay = Math.min(times * 50, 2000);
		console.warn(`🔁 Redis reconnect attempt #${times} — waiting ${delay}ms`);
		return delay;
	},

	// Handle specific errors
	reconnectOnError: (err) => {
		const targetErrors = [/READONLY/, /ECONNRESET/, /ETIMEDOUT/];
		const shouldReconnect = targetErrors.some((re) => re.test(err.message));
		if (shouldReconnect) {
			console.warn("⚠️ Redis reconnecting after error:", err.message);
		}
		return shouldReconnect;
	},
};

// --- Create publisher & subscriber clients
const publisher = new Redis(process.env.REDIS_URL, redisOptions);
const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

// --- Log connection status
[publisher, subscriber].forEach((client, i) => {
	const label = i === 0 ? "Publisher" : "Subscriber";
	client.on("connect", () => console.log(`✅ ${label} connected to Redis`));
	client.on("ready", () => console.log(`🚀 ${label} ready`));
	client.on("error", (err) => console.error(`❌ ${label} Redis error:`, err.message));
	client.on("close", () => console.warn(`🔌 ${label} Redis connection closed`));
	client.on("reconnecting", () => console.warn(`🔁 ${label} Redis reconnecting...`));
});

// --- Create RedisPubSub instance
pubsub = new RedisPubSub({ publisher, subscriber });

// --- Optional: test ping & publish a test message
(async () => {
	try {
		const pong = await publisher.ping();
		console.log("📡 Redis ping response:", pong);

		const TEST_CHANNEL = "connection_test_channel";
		// Subscribe & log
		const asyncIterator = pubsub.asyncIterator(TEST_CHANNEL);
		(async () => {
			for await (const payload of asyncIterator) {
				console.log("📨 Received message from Redis PubSub:", payload);
			}
		})();

		// Publish test message after 1s
		setTimeout(async () => {
			const message = { msg: "Hello from RedisPubSub!" };
			await pubsub.publish(TEST_CHANNEL, message);
			console.log("🚀 Published test message to Redis PubSub:", message);
		}, 1000);
	} catch (err) {
		console.error("🚨 Redis PubSub test failed:", err.message);
	}
})();

export default pubsub;

// !!!! old pub sub code (does not works on render at the moment )

// import "dotenv/config"; // loads .env file
// import { PubSub } from "graphql-subscriptions";
// import { RedisPubSub } from "graphql-redis-subscriptions";
// import Redis from "ioredis";

// let pubsub;

// if (process.env.REDIS_URL && process.env.BUILD) {
// 	console.log("Using Upstash Redis PubSub via TCP");
// 	// console.log("ignore for now ");

// 	//  Use REDIS_URL directly
// 	const publisher = new Redis(process.env.REDIS_URL, {
// 		// tls: {}, // required for secure connection
// 		retryStrategy: (times) => Math.min(times * 50, 2000),
// 	});

// 	const subscriber = new Redis(process.env.REDIS_URL, {
// 		// tls: {},
// 		retryStrategy: (times) => Math.min(times * 50, 2000),
// 	});

// 	pubsub = new RedisPubSub({ publisher, subscriber });
// } else {
// 	console.warn(" Using in-memory PubSub fallback");
// 	pubsub = new PubSub();
// }

// export default pubsub;

// // Connect to your Key Value instance using the REDIS_URL environment variable
// // The REDIS_URL is set to the internal connection URL e.g. redis://red-343245ndffg023:6379
// const redis = new Redis(process.env.REDIS_URL);

// // Set and retrieve some values
// await redis.set("key", "ioredis");
// const result = await redis.get("key");
// console.log("this is from the example ", result);
