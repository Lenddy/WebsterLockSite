import "dotenv/config";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";
import { PubSub } from "graphql-subscriptions";

let pubsub = null;

// Only create once (singleton)
if (!pubsub) {
	if (process.env.REDIS_URL && process.env.BUILD) {
		// --- Redis connection options for Upstash (tuned)
		const redisOptions = {
			tls: {}, // Upstash requires TLS
			lazyConnect: true, // do not connect immediately; connect on first command
			// limit retries to avoid infinite loops and high usage
			maxRetriesPerRequest: 5,
			retryStrategy: (times) => {
				// exponential backoff-ish with cap
				const base = 50;
				const delay = Math.min(base * Math.pow(2, Math.min(times, 6)), 2000);
				console.warn(`Redis reconnect attempt #${times} — waiting ${delay}ms`);
				return delay;
			},
			reconnectOnError: (err) => {
				// reconnect only on transient network errors
				const targetErrors = [/READONLY/, /ECONNRESET/, /ETIMEDOUT/];
				const shouldReconnect = targetErrors.some((re) => re.test(err.message));
				if (shouldReconnect) console.warn("Redis reconnecting after error:", err.message);
				return shouldReconnect;
			},
			enableReadyCheck: true,
		};

		// --- Create publisher & subscriber (these won't immediately connect)
		const publisher = new Redis(process.env.REDIS_URL, redisOptions);
		const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

		// --- Log Redis connection lifecycle (helpful diagnostics)
		[publisher, subscriber].forEach((client, i) => {
			const label = i === 0 ? "Publisher" : "Subscriber";
			client.on("connect", () => console.log(`${label} connected to Redis`));
			client.on("ready", () => console.log(`${label} ready`));
			client.on("error", (err) => console.error(`${label} Redis error:`, err.message));
			client.on("close", () => console.warn(`${label} Redis connection closed`));
			client.on("reconnecting", () => console.warn(`${label} Redis reconnecting...`));
		});

		// --- Create RedisPubSub instance
		const redisPubsub = new RedisPubSub({ publisher, subscriber });

		// --- Subscriber counter wrapper for asyncIterator
		let subscriberCount = 0;
		// const originalAsyncIterator = redisPubsub.asyncIterator.bind(redisPubsub);
		const originalAsyncIterator = redisPubsub.asyncIterableIterator.bind(redisPubsub);

		// redisPubsub.

		redisPubsub.asyncIterableIterator = (trigger) => {
			// redisPubsub.asyncIterator = (trigger) => {
			subscriberCount++;
			console.log(`Subscriber connected → total: ${subscriberCount} (channel: ${trigger})`);

			const asyncIter = originalAsyncIterator(trigger);

			// wrap return to decrement counter on unsubscribe / end
			const origReturn = asyncIter.return?.bind(asyncIter);
			asyncIter.return = (...args) => {
				subscriberCount = Math.max(0, subscriberCount - 1);
				console.log(`Subscriber disconnected → total: ${subscriberCount} (channel: ${trigger})`);

				return origReturn ? origReturn(...args) : Promise.resolve({ value: undefined, done: true });
			};
			// console.log(`Subscriber connected → total: ${subscriberCount} (channel: ${trigger})`);
			return asyncIter;
		};

		// TEMP TEST (forces an iterator so we know logging works)
		// if (redisPubsub.__testLogged !== true) {
		// 	redisPubsub.__testLogged = true;

		// 	const test = redisPubsub.asyncIterator("TEST_CHANNEL");
		// 	console.log("Test asyncIterator created");

		// 	// Clean up test actor after 2 seconds
		// 	setTimeout(() => {
		// 		if (test.return) test.return();
		// 		console.log("Test iterator closed");
		// 	}, 2000);
		// }

		// --- expose a getter for monitoring if you want
		redisPubsub.__getSubscriberCount = () => subscriberCount;

		pubsub = redisPubsub;

		// --- graceful close on process exit to avoid zombie connections in dev (nodemon)
		const shutdown = async () => {
			try {
				console.log("Shutting down Redis clients...");
				await Promise.all([publisher.quit().catch(() => publisher.disconnect()), subscriber.quit().catch(() => subscriber.disconnect())]);
			} catch (e) {
				console.warn("Error during Redis shutdown:", e.message);
			}
		};
		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
		process.on("beforeExit", shutdown);
	} else {
		console.warn(" Using in-memory PubSub fallback");
		pubsub = new PubSub();
	}
}

export default pubsub;

// !!!! current code
// // pubsub.js
// import "dotenv/config";
// import { RedisPubSub } from "graphql-redis-subscriptions";
// import Redis from "ioredis";
// import { PubSub } from "graphql-subscriptions";

// // if (!process.env.REDIS_URL) {
// // 	throw new Error("REDIS_URL is not set in your .env file");
// // }
// let pubsub;
// // !!!!!! make a counter for how my users are subscribe at the moment

// if (process.env.REDIS_URL && process.env.BUILD) {
// 	// --- Redis connection options for Upstash
// 	const redisOptions = {
// 		tls: {}, // Upstash requires TLS
// 		retryStrategy: (times) => {
// 			const delay = Math.min(times * 50, 2000);
// 			console.warn(` Redis reconnect attempt #${times} — waiting ${delay}ms`);
// 			return delay;
// 		},
// 		reconnectOnError: (err) => {
// 			const targetErrors = [/READONLY/, /ECONNRESET/, /ETIMEDOUT/];
// 			const shouldReconnect = targetErrors.some((re) => re.test(err.message));
// 			if (shouldReconnect) console.warn(" Redis reconnecting after error:", err.message);
// 			return shouldReconnect;
// 		},
// 		maxRetriesPerRequest: null, // keep trying indefinitely
// 	};

// 	// --- Create publisher & subscriber
// 	const publisher = new Redis(process.env.REDIS_URL, redisOptions);
// 	const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

// 	// --- Optional: log Redis connection status
// 	[publisher, subscriber].forEach((client, i) => {
// 		const label = i === 0 ? "Publisher" : "Subscriber";
// 		client.on("connect", () => console.log(`${label} connected to Redis`));
// 		client.on("ready", () => console.log(`${label} ready`));
// 		client.on("error", (err) => console.error(` ${label} Redis error:`, err.message));
// 		client.on("close", () => console.warn(`🔌 ${label} Redis connection closed`));
// 		client.on("reconnecting", () => console.warn(`${label} Redis reconnecting...`));
// 	});

// 	// --- Create RedisPubSub
// 	pubsub = new RedisPubSub({ publisher, subscriber });

// 	// --- Optional: test publishing
// 	// (
// 	// 	async () => {
// 	// 	try {
// 	// 		const pong = await publisher.ping();
// 	// 		console.log(" Redis ping response:", pong);

// 	// 		const TEST_CHANNEL = "test_channel";
// 	// 		const asyncIterator = pubsub.asyncIterator(TEST_CHANNEL);

// 	// 		// Log any test messages
// 	// 		(async () => {
// 	// 			for await (const payload of asyncIterator) {
// 	// 				console.log(" Received test message:", payload);
// 	// 			}
// 	// 		})();

// 	// 		// Publish a test message after 1s
// 	// 		setTimeout(async () => {
// 	// 			const message = { msg: "Hello from Upstash RedisPubSub!" };
// 	// 			await pubsub.publish(TEST_CHANNEL, message);
// 	// 			console.log("Published test message:", message);
// 	// 		}, 1000);
// 	// 	} catch (err) {
// 	// 		console.error(" Redis PubSub test failed:", err.message);
// 	// 	}
// 	// }

// 	// )();
// } else {
// 	console.warn(" Using in-memory PubSub fallback");
// 	pubsub = new PubSub();
// }

// export default pubsub;

// server/graphql/pubsub.js
