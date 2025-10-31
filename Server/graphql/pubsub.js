// pubsub.js
import "dotenv/config";
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

if (process.env.REDIS_URL && process.env.BUILD) {
	console.log("✅ Using Redis PubSub via TCP");

	// --- Connection options with retry & logging
	const redisOptions = {
		// tls: {}, // Required for secure Upstash/Render connections
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

	// --- Helpful connection logging
	const logStatus = (client, label) => {
		client.on("connect", () => console.log(`✅ ${label} connected to Redis`));
		client.on("ready", () => console.log(`🚀 ${label} ready`));
		client.on("error", (err) => console.error(`❌ ${label} Redis error:`, err.message));
		client.on("close", () => console.warn(`🔌 ${label} Redis connection closed`));
		client.on("reconnecting", () => console.warn(`🔁 ${label} Redis reconnecting...`));
	};

	logStatus(publisher, "Publisher");
	logStatus(subscriber, "Subscriber");

	pubsub = new RedisPubSub({
		publisher,
		subscriber,
	});
} else {
	console.warn("Using in-memory PubSub (no Redis connection)");
	pubsub = new PubSub();
}

export default pubsub;

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
