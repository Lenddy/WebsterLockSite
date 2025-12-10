// pubsub.js
// import "dotenv/config";
// import { RedisPubSub } from "graphql-redis-subscriptions";
// import Redis from "ioredis";
// import { PubSub } from "graphql-subscriptions";

// function makeCompat(pubsubImpl) {
// 	// Preserve original reference so we can still call methods directly
// 	const impl = pubsubImpl;

// 	// Helper to call underlying method if present
// 	function callImpl(methods, ...args) {
// 		for (const m of methods) {
// 			if (typeof impl[m] === "function") return impl[m].apply(impl, args);
// 		}
// 		throw new Error(`Underlying PubSub does not implement any of: ${methods.join(", ")}`);
// 	}

// 	// Build the compatibility wrapper object
// 	const compat = {
// 		// basic passthroughs
// 		publish: (...args) => callImpl(["publish"], ...args),
// 		asyncIterator: (...triggers) => callImpl(["asyncIterator", "asyncIterableIterator"], ...triggers),
// 		asyncIterableIterator: (...triggers) => callImpl(["asyncIterableIterator", "asyncIterator"], ...triggers),
// 		// optionally expose subscribe if underlying has it (some libs do)
// 		subscribe: (...args) => (typeof impl.subscribe === "function" ? impl.subscribe.apply(impl, args) : undefined),
// 		// give access to the raw impl if you ever need it
// 		_raw: impl,
// 	};

// 	// copy any other useful methods (optional)
// 	if (typeof impl.on === "function") compat.on = (...a) => impl.on(...a);
// 	if (typeof impl.off === "function") compat.off = (...a) => impl.off(...a);

// 	return compat;
// }

// let pubsub;

// if (process.env.REDIS_URL && process.env.BUILD) {
// 	// Upstash / RedisPubSub branch
// 	const redisOptions = {
// 		tls: {},
// 		retryStrategy: (times) => Math.min(times * 50, 2000),
// 		reconnectOnError: (err) => {
// 			const targetErrors = [/READONLY/, /ECONNRESET/, /ETIMEDOUT/];
// 			return targetErrors.some((re) => re.test(err.message));
// 		},
// 		maxRetriesPerRequest: null,
// 	};

// 	const publisher = new Redis(process.env.REDIS_URL, redisOptions);
// 	const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

// 	[publisher, subscriber].forEach((c, i) => {
// 		const label = i === 0 ? "Publisher" : "Subscriber";
// 		c.on("connect", () => console.log(` ${label} connected to Redis`));
// 		c.on("ready", () => console.log(` ${label} ready`));
// 		c.on("error", (err) => console.error(` ${label} Redis error:`, err.message));
// 	});

// 	const redisPubsub = new RedisPubSub({ publisher, subscriber });
// 	pubsub = makeCompat(redisPubsub);
// 	console.log(" Using RedisPubSub (Upstash)");
// } else {
// 	// in-memory fallback
// 	console.warn(" Using in-memory PubSub fallback");
// 	const localPubSub = new PubSub();

// 	// wrap
// 	pubsub = makeCompat(localPubSub);

// 	// helpful debug logs
// 	if (process.env.NODE_ENV !== "production") {
// 		console.log("ℹ In-memory PubSub ready (compat wrapper)");
// 	}
// }

// export default pubsub;

// !!! old
// // pubsub.js
import "dotenv/config";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";
import { PubSub } from "graphql-subscriptions";

// if (!process.env.REDIS_URL) {
// 	throw new Error("REDIS_URL is not set in your .env file");
// }
let pubsub;

if (process.env.REDIS_URL && process.env.BUILD) {
	// --- Redis connection options for Upstash
	const redisOptions = {
		tls: {}, // Upstash requires TLS
		retryStrategy: (times) => {
			const delay = Math.min(times * 50, 2000);
			console.warn(`🔁 Redis reconnect attempt #${times} — waiting ${delay}ms`);
			return delay;
		},
		reconnectOnError: (err) => {
			const targetErrors = [/READONLY/, /ECONNRESET/, /ETIMEDOUT/];
			const shouldReconnect = targetErrors.some((re) => re.test(err.message));
			if (shouldReconnect) console.warn("⚠️ Redis reconnecting after error:", err.message);
			return shouldReconnect;
		},
		maxRetriesPerRequest: null, // keep trying indefinitely
	};

	// --- Create publisher & subscriber
	const publisher = new Redis(process.env.REDIS_URL, redisOptions);
	const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

	// --- Optional: log Redis connection status
	[publisher, subscriber].forEach((client, i) => {
		const label = i === 0 ? "Publisher" : "Subscriber";
		client.on("connect", () => console.log(`✅ ${label} connected to Redis`));
		client.on("ready", () => console.log(`🚀 ${label} ready`));
		client.on("error", (err) => console.error(`❌ ${label} Redis error:`, err.message));
		client.on("close", () => console.warn(`🔌 ${label} Redis connection closed`));
		client.on("reconnecting", () => console.warn(`🔁 ${label} Redis reconnecting...`));
	});

	// --- Create RedisPubSub
	pubsub = new RedisPubSub({ publisher, subscriber });

	// --- Optional: test publishing
	// (
	// 	async () => {
	// 	try {
	// 		const pong = await publisher.ping();
	// 		console.log("📡 Redis ping response:", pong);

	// 		const TEST_CHANNEL = "test_channel";
	// 		const asyncIterator = pubsub.asyncIterator(TEST_CHANNEL);

	// 		// Log any test messages
	// 		(async () => {
	// 			for await (const payload of asyncIterator) {
	// 				console.log("📨 Received test message:", payload);
	// 			}
	// 		})();

	// 		// Publish a test message after 1s
	// 		setTimeout(async () => {
	// 			const message = { msg: "Hello from Upstash RedisPubSub!" };
	// 			await pubsub.publish(TEST_CHANNEL, message);
	// 			console.log("🚀 Published test message:", message);
	// 		}, 1000);
	// 	} catch (err) {
	// 		console.error("🚨 Redis PubSub test failed:", err.message);
	// 	}
	// }

	// )();
} else {
	console.warn(" Using in-memory PubSub fallback");
	pubsub = new PubSub();
}

export default pubsub;
