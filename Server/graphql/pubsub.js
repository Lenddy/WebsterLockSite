import "dotenv/config"; // loads .env file
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

if (process.env.REDIS_URL && process.env.BUILD) {
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
