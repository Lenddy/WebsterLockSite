// pubsub.js
import "dotenv/config";
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

if (process.env.REDIS_URL && process.env.BUILD) {
	console.log("✅ Using Redis PubSub via TCP");

	const redisOptions = {
		tls: {}, // Upstash requires TLS
		retryStrategy: (times) => {
			const delay = Math.min(times * 200, 3000);
			console.warn(`🔁 Redis reconnect attempt #${times} — waiting ${delay}ms`);
			return delay;
		},
		reconnectOnError: (err) => {
			const targetErrors = [/READONLY/, /ECONNRESET/, /ETIMEDOUT/];
			const shouldReconnect = targetErrors.some((re) => re.test(err.message));
			if (shouldReconnect) {
				console.warn("⚠️ Redis reconnecting after error:", err.message);
			}
			return shouldReconnect;
		},
	};

	const publisher = new Redis(process.env.REDIS_URL, redisOptions);
	const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

	const logStatus = (client, label) => {
		client.on("connect", () => console.log(`✅ ${label} connected to Redis`));
		client.on("ready", () => console.log(`🚀 ${label} ready`));
		client.on("error", (err) => console.error(`❌ ${label} Redis error:`, err.message));
		client.on("close", () => console.warn(`🔌 ${label} Redis connection closed`));
		client.on("reconnecting", () => console.warn(`🔁 ${label} Redis reconnecting...`));
	};

	logStatus(publisher, "Publisher");
	logStatus(subscriber, "Subscriber");

	// --- Test actual connectivity with a ping
	(async () => {
		try {
			const pong = await publisher.ping();
			console.log(`📡 Redis ping response: ${pong}`);
		} catch (err) {
			console.error("🚨 Redis ping failed:", err.message);
		}
	})();

	pubsub = new RedisPubSub({ publisher, subscriber });
} else {
	console.warn("Using in-memory PubSub (no Redis connection)");
	pubsub = new PubSub();
}

export default pubsub;

// --- TEST PUBSUB MESSAGES ---
(async () => {
	try {
		// Step 1: Define a test channel name
		const TEST_CHANNEL = "connection_test_channel";

		// Step 2: Subscribe to the test channel
		const subIterator = await pubsub.asyncIterableIterator(TEST_CHANNEL);
		(async () => {
			for await (const payload of subIterator) {
				console.log("📨 Received message from Redis PubSub:", payload);
			}
		})();

		// Step 3: Publish a test message after a small delay
		setTimeout(async () => {
			const message = { msg: "Hello from Redis PubSub test!" };
			await pubsub.publish(TEST_CHANNEL, message);
			console.log("🚀 Published test message to Redis PubSub:", message);
		}, 2000);
	} catch (err) {
		console.error("🚨 PubSub test failed:", err.message);
	}
})();

// !!!! old pub sub code (does not works on render at the moment )

// import "dotenv/config"; // loads .env file
// import { PubSub } from "graphql-subscriptions";
// import { RedisPubSub } from "graphql-redis-subscriptions";
// import Redis from "ioredis";

// let pubsub;

// if (process.env.REDIS_URL && process.env.BUILD) {
// 	console.log("Using Upstash Redis PubSub via TCP");

// 	//  Use REDIS_URL directly
// 	const publisher = new Redis(process.env.REDIS_URL, {
// 		tls: {}, // required for secure connection
// 		retryStrategy: (times) => Math.min(times * 50, 2000),
// 	});

// 	const subscriber = new Redis(process.env.REDIS_URL, {
// 		tls: {},
// 		retryStrategy: (times) => Math.min(times * 50, 2000),
// 	});

// 	pubsub = new RedisPubSub({ publisher, subscriber });
// } else {
// 	console.warn(" Using in-memory PubSub fallback");
// 	pubsub = new PubSub();
// }

// export default pubsub;
