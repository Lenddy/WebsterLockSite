// # TODO List (Prioritized)

// ## 🔥 High Priority – Critical Fixes
// [ ] Combine providers for users and items
// [ ] Verify user is updated and ensure getAll still works with new fetching logic
// [ ] Fix update-as-tech issue: Material Request update not reflected on GetOne view
// [ ] Fix GraphQL PubSub error: "Cannot read properties of undefined (reading 'id')"
// [ ] Ensure refetch only happens when needed; prevent unnecessary API calls
// [ ] Prevent restricted routes from appearing
//   - [ ] /user/userID
//   - [ ] /admin/user/register
// [ ] Fix refetch logic so each screen refetches ONLY its active data
// [ ] Ensure new users appear to the creator via cache update
//   - [ ] Also apply to item groups
// [ ] Add new pubsub triggers to backend & frontend
// [ ] Add GraphQL validation on Create Item
// [ ] Fix token loss in PWA by migrating to IndexedDB
// [ ] Handle multiple user sessions without overwriting localStorage
// [ ] Fix route mismatch error
//   - [ ] Cast to ObjectId failed for “allsdjfksjdf”

// ## ⚙️ Backend / Redis / Indexing
// [ ] Add Redis index for users
//   - [ ] Use hash + set pattern
//   - [ ] Map user ID to hash lookup
//   - [ ] Fetch full data from set
// [ ] Add additional PubSubs for update & delete
// [ ] Build "index" for Material Request (similar to redis demo)
// [ ] Improve backend logs & provider merging

// ## 🧪 Validation, Errors, UX
// [ ] GraphQL errors must appear directly under component inputs
// [ ] All validation UI messages should render under inputs
// [ ] Add toast notifications globally

// ## 🧭 Routing Improvements
// [ ] Create index route for /material/request/request
//   - [ ] CreateOneMaterialRequest component
// [ ] Fix pattern conflicts between:
//   - [ ] /material/request/all
//   - [ ] /material/request/:requestId/update?

// ## 🗂 UI & Data Display
// ### Users
// [ ] Allow users to edit their own profile
// [ ] Show error messages centered on tables
// [ ] Add an internal user number & allow search by number

// ### Material Requests
// [ ] Add multi-condition item selector
//   - [ ] If “for”: show dropdown of previously selected items
//   - [ ] If “w/” or “&”: dropdown of all available items
//   - [ ] Support typing custom value if not in dropdown
// [ ] Show additional input depending on condition
// [ ] Add “Not Approved” button on review screen (turn red when clicked)
// [ ] Add filters: all / approved / not approved

// ### Item Usage
// [ ] When clicking an item, show user that requested it + date
// [ ] Add filters
//   - [ ] date
//   - [ ] name
//   - [ ] number
//   - [ ] email
// [ ] Also allow filter by:
//   - [ ] size
//   - [ ] color
//   - [ ] hand

// ## ⭐ Nice to Have / UI Polish
// [ ] Add toast notifications
// [ ] Add animations / transitions later

//!!!! pub sub

// 1) Replace graphql/pubsub.js with this (or paste the changes)

// This keeps the same approach you had, but:

// uses a singleton (so imports don't create many clients)

// uses lazyConnect: true so clients don't connect until needed

// caps retries (maxRetriesPerRequest: 5) and uses safe backoff

// adds the subscriber counter wrapper (logs connect/disconnect)

// adds graceful close handlers

// // server/graphql/pubsub.js
// import "dotenv/config";
// import { RedisPubSub } from "graphql-redis-subscriptions";
// import Redis from "ioredis";
// import { PubSub } from "graphql-subscriptions";

// let pubsub = null;

// // Only create once (singleton)
// if (!pubsub) {
//   if (process.env.REDIS_URL && process.env.BUILD) {
//     // --- Redis connection options for Upstash (tuned)
//     const redisOptions = {
//       tls: {}, // Upstash requires TLS
//       lazyConnect: true, // do not connect immediately; connect on first command
//       // limit retries to avoid infinite loops and high usage
//       maxRetriesPerRequest: 5,
//       retryStrategy: (times) => {
//         // exponential backoff-ish with cap
//         const base = 50;
//         const delay = Math.min(base * Math.pow(2, Math.min(times, 6)), 2000);
//         console.warn(`🔁 Redis reconnect attempt #${times} — waiting ${delay}ms`);
//         return delay;
//       },
//       reconnectOnError: (err) => {
//         // reconnect only on transient network errors
//         const targetErrors = [/READONLY/, /ECONNRESET/, /ETIMEDOUT/];
//         const shouldReconnect = targetErrors.some((re) => re.test(err.message));
//         if (shouldReconnect) console.warn("⚠️ Redis reconnecting after error:", err.message);
//         return shouldReconnect;
//       },
//       enableReadyCheck: true,
//     };

//     // --- Create publisher & subscriber (these won't immediately connect)
//     const publisher = new Redis(process.env.REDIS_URL, redisOptions);
//     const subscriber = new Redis(process.env.REDIS_URL, redisOptions);

//     // --- Log Redis connection lifecycle (helpful diagnostics)
//     [publisher, subscriber].forEach((client, i) => {
//       const label = i === 0 ? "Publisher" : "Subscriber";
//       client.on("connect", () => console.log(`✅ ${label} connected to Redis`));
//       client.on("ready", () => console.log(`🚀 ${label} ready`));
//       client.on("error", (err) => console.error(`❌ ${label} Redis error:`, err.message));
//       client.on("close", () => console.warn(`🔌 ${label} Redis connection closed`));
//       client.on("reconnecting", () => console.warn(`🔁 ${label} Redis reconnecting...`));
//     });

//     // --- Create RedisPubSub instance
//     const redisPubsub = new RedisPubSub({ publisher, subscriber });

//     // --- Subscriber counter wrapper for asyncIterator
//     let subscriberCount = 0;
//     const originalAsyncIterator = redisPubsub.asyncIterator.bind(redisPubsub);

//     redisPubsub.asyncIterator = (trigger) => {
//       subscriberCount++;
//       console.log(`📡 Subscriber connected → total: ${subscriberCount} (channel: ${trigger})`);

//       const asyncIter = originalAsyncIterator(trigger);

//       // wrap return to decrement counter on unsubscribe / end
//       const origReturn = asyncIter.return?.bind(asyncIter);
//       asyncIter.return = (...args) => {
//         subscriberCount = Math.max(0, subscriberCount - 1);
//         console.log(`🔌 Subscriber disconnected → total: ${subscriberCount} (channel: ${trigger})`);

//         return origReturn ? origReturn(...args) : Promise.resolve({ value: undefined, done: true });
//       };

//       return asyncIter;
//     };

//     // --- expose a getter for monitoring if you want
//     redisPubsub.__getSubscriberCount = () => subscriberCount;

//     pubsub = redisPubsub;

//     // --- graceful close on process exit to avoid zombie connections in dev (nodemon)
//     const shutdown = async () => {
//       try {
//         console.log("🛑 Shutting down Redis clients...");
//         await Promise.all([publisher.quit().catch(() => publisher.disconnect()), subscriber.quit().catch(() => subscriber.disconnect())]);
//       } catch (e) {
//         console.warn("⚠️ Error during Redis shutdown:", e.message);
//       }
//     };
//     process.on("SIGINT", shutdown);
//     process.on("SIGTERM", shutdown);
//     process.on("beforeExit", shutdown);
//   } else {
//     console.warn(" Using in-memory PubSub fallback");
//     pubsub = new PubSub();
//   }
// }

// export default pubsub;

// Notes about these options

// lazyConnect: true avoids creating connections until a publish/subscribe happens. This reduces Upstash usage in dev.

// maxRetriesPerRequest: 5 prevents infinite reconnect loops consuming your Upstash quota.

// retryStrategy uses capped exponential backoff to avoid hammering.

// The asyncIterator wrapper logs connections and disconnections so you can see if clients are leaking.

// The __getSubscriberCount method can be used in a debug route or REPL to check current count.

// 2) Make your subscription resolvers defensive (example)

// Problem: If subscribe or any logic inside it throws (for ex. getAllUsers that requires permissions), the WS connection / subscription negotiation may fail or propagate an error that effectively kills the connection. So do not run DB queries that can throw during subscribe. Instead:

// check auth/permissions first (quick in-memory check)

// return pubsub.asyncIterator(...) immediately

// in resolve, filter payload or run safe queries and handle errors

// Example materialRequest subscription resolver pattern:

// // server/graphql/resolvers/materialRequest.resolver.js
// export const materialRequestResolvers = {
//   Subscription: {
//     onMaterialRequestChange: {
//       // subscribe should be defensive and NOT perform DB calls that can throw
//       subscribe: (parent, args, context) => {
//         const user = context?.user;

//         // Quick permission check: if subscription requires being authenticated, return denied
//         if (!user) {
//           // do NOT throw here; return an asyncIterator that publishes nothing OR throw a controlled ApolloError
//           throw new Error("Unauthorized: No user context for subscriptions.");
//         }

//         // If you want to filter channels per user, you can return channel name(s) here,
//         // but avoid DB calls in subscribe() so it can't fail and kill WS.
//         return context.pubsub.asyncIterator("MATERIAL_REQUEST_ADDED");
//       },

//       // resolve is where you SHOULD filter payload per-subscriber based on permissions
//       resolve: (payload, args, context) => {
//         try {
//           const event = payload.onMaterialRequestChange;

//           // Optionally filter by requester or user permissions
//           const user = context?.user;

//           // Example: only return items that the user is allowed to see
//           if (!user) return null;

//           // If event contains multiple created items, filter by the user's userId if needed
//           if (event.changeType === "multiple") {
//             const allowed = event.changes.filter((r) => {
//               // show only requests owned by this user OR if user has view-all permission
//               return user.permissions?.canViewAllUsers || r.requester?.userId === user.userId;
//             });
//             // if nothing to show for this subscriber, return null so client ignores
//             if (!allowed.length) return null;
//             return { ...event, changes: allowed };
//           }

//           // single change
//           const change = event.change;
//           if (!user.permissions?.canViewAllUsers && change.requester?.userId !== user.userId) {
//             return null;
//           }

//           return event;
//         } catch (err) {
//           console.error("Subscription resolve error:", err);
//           // swallow or return null to avoid crashing WS
//           return null;
//         }
//       },
//     },
//   },
// };

// Why this prevents crashes

// subscribe() does a tiny auth check and returns the iterator. If the user is unauthorized, throw a clear error (which the client can show) but don’t perform DB calls there.

// resolve() safely inspects the published payload and either filters it or returns null. An exception in resolve() won't close the whole WS server the same way a thrown error during subscription handshake often does.

// 3) Minor server.js safety notes (graceful shutdown + single pubsub injection)

// You are already passing pubsub into HTTP and WS context — good. Add these quick lines to your startServer so nodemon restarts don’t leave zombies:

// // after httpServer.listen(...)
// const gracefulStop = async () => {
//   console.log("Server shutting down...");
//   try {
//     // If your pubsub has a shutdown we added earlier, it will be invoked via process handlers.
//     // Close http server
//     httpServer.close();
//   } catch (e) {
//     console.warn("Graceful stop error:", e.message);
//   } finally {
//     process.exit(0);
//   }
// };
// process.on("SIGINT", gracefulStop);
// process.on("SIGTERM", gracefulStop);

// (You already call process.on inside pubsub.js to close Redis clients — keep both.)

// 4) Additional defensive steps (small, optional but helpful)

// Avoid publishing excessively in mutation resolvers (debounce or batch multiple publishes when creating many requests). Creating many publish calls can spike Upstash usage.

// Remove heavy DB lookups from subscribe(). If you must do them, wrap them in try/catch and return a safe iterator when they fail.

// Expose a debug endpoint (only in dev) to read pubsub.__getSubscriberCount() so you can monitor subscribers:

// app.get("/debug/subscribers", (req, res) => {
//   return res.json({ subscribers: pubsub.__getSubscriberCount?.() ?? -1 });
// });

// Monitor Upstash: watch connection count / in-flight messages in Upstash UI for spikes while you test.

// 5) Testing checklist (do these after you apply patches)

// Restart server (nodemon). Watch server logs — publisher/subscriber should show connect/ready, NOT a flood of reconnect attempts.

// Open one browser tab as felipe (mechanic, limited permissions) and one as admin.

// On felipe page: ensure he doesn't run getAllUsers on page load (frontend skip).

// Connect admin to the users page and confirm USER_CHANGE_SUBSCRIPTION connects (see subscriber counter).

// From felipe create a createMultipleMaterialRequests mutation — server should publish; subscribers should see it; logs show publish and counts unchanged.

// Intentionally trigger an unauthorized query (simulate felipe trying to fetch all users). It should return GraphQL error but should not drop the Redis connection or crash WS. You can test by performing that query and then doing another mutation — subscriptions should still work.

// While running many create requests, watch Upstash usage — it should be steady (no reconnection storm).

// Check the /debug/subscribers endpoint to see current subscriber count.

// Why this will fix your exact symptoms

// Your logs showed ECONNRESET and reconnect loops — those came from too many/unstable Redis clients and infinite retry policy. The new pubsub.js limits retries and uses lazy connect.

// Unauthorized resolver calls that throw during subscription setup could error out and indirectly force reconnects. The defensive subscribe/resolve pattern prevents that by avoiding DB calls and throwing only controlled errors.

// The subscriber counter/logs will let you see when clients leak or when nodemon caused multiple connections — so you can trace spikes.

// Do you want me to:

// apply the patched pubsub.js exactly into your repo (I gave the complete file)?

// rewrite one of your actual subscription resolvers (e.g., onMaterialRequestChange) to the defensive pattern using your real field names?

// add the /debug/subscribers endpoint for quick monitoring?

// Tell me which one and I’ll produce the exact code (full file) to paste into your project.
