// pubsub.js
import "dotenv/config";
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

if (process.env.NODE_ENV === "production") {
	console.log(" Using RedisPubSub for production");

	const redisOptions = {
		tls: {}, // REQUIRED for Render ValKey — just an empty object
		connectTimeout: 10000, // 10 seconds
		retryStrategy: (times) => Math.min(times * 50, 2000),
		reconnectOnError: (err) => [/READONLY/, /ECONNRESET/, /ETIMEDOUT/].some((re) => re.test(err.message)),
		maxRetriesPerRequest: null, // Prevent crash after retries
	};

	// Use rediss:// (TLS) for Render ValKey
	const publisher = new Redis(process.env.REDIS_URL.replace("redis://", "rediss://"), redisOptions);
	const subscriber = new Redis(process.env.REDIS_URL.replace("redis://", "rediss://"), redisOptions);

	pubsub = new RedisPubSub({ publisher, subscriber });

	// Optional: log Redis events
	[publisher, subscriber].forEach((client, i) => {
		const label = i === 0 ? "Publisher" : "Subscriber";
		client.on("connect", () => console.log(` ${label} connected to Redis`));
		client.on("ready", () => console.log(` ${label} ready`));
		client.on("error", (err) => console.error(` ${label} Redis error:`, err.message));
		client.on("close", () => console.warn(` ${label} Redis connection closed`));
		client.on("reconnecting", () => console.warn(`${label} Redis reconnecting...`));
	});
} else {
	console.log(" Using in-memory PubSub for development");
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
