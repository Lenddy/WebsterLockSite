// import { useEffect, useState, useCallback } from "react";

// // Detect Brave browser
// async function detectBrave() {
// 	try {
// 		return navigator.brave && (await navigator.brave.isBrave().catch(() => false));
// 	} catch {
// 		return false;
// 	}
// }

// // Detect privacy extensions / shields blocking WebSockets
// function detectWebSocketBlocking() {
// 	return new Promise((resolve) => {
// 		let resolved = false;

// 		const ws = new WebSocket(import.meta.env.VITE_WS_URL); // update port if needed
// 		// console.log(import.meta.env.VITE_WS_URL);

// 		const timer = setTimeout(() => {
// 			if (!resolved) {
// 				resolved = true;
// 				resolve(true); // timed out → blocked
// 			}
// 		}, 1200);

// 		ws.onopen = () => {
// 			if (!resolved) {
// 				resolved = true;
// 				clearTimeout(timer);
// 				ws.close();
// 				resolve(false); // works → not blocked
// 			}
// 		};

// 		ws.onerror = () => {
// 			if (!resolved) {
// 				resolved = true;
// 				clearTimeout(timer);
// 				resolve(true); // blocked
// 			}
// 		};
// 	});
// }

// // Main hook
// export function usePrivacyGuard() {
// 	const [status, setStatus] = useState({
// 		brave: false,
// 		wsBlocked: false,
// 		shieldsActive: false,
// 		anyPrivacyBlocker: false,
// 		checked: false,
// 	});

// 	const runCheck = useCallback(async () => {
// 		const brave = await detectBrave();
// 		const wsBlocked = await detectWebSocketBlocking();

// 		setStatus({
// 			brave,
// 			wsBlocked,
// 			shieldsActive: brave && wsBlocked,
// 			anyPrivacyBlocker: wsBlocked,
// 			checked: true,
// 		});
// 	}, []);

// 	useEffect(() => {
// 		runCheck();
// 	}, [runCheck]);

// 	console.log("from privacy guard", {
// 		...status,
// 		recheck: runCheck,
// 	});

// 	return {
// 		...status,
// 		recheck: runCheck,
// 		test: true,
// 	};
// }
import { useEffect, useState, useCallback } from "react";

// Detect Brave
async function detectBrave() {
	try {
		if (!navigator.brave) return false;
		return await navigator.brave.isBrave();
	} catch {
		return false;
	}
}

// // Detect Brave Shields ON
// async function detectBraveShields() {
// 	if (!navigator.brave) return false;

// 	try {
// 		// const res = await fetch("https://privacy-test-pages.glitch.me/tracking/trackers.js", {
// 		// 	method: "HEAD",
// 		// });
// 		const res = await fetch("https://cors-test.codehappy.dev/ok.txt", {
// 			method: "HEAD",
// 		});

// 		// If blocked → Brave Shields ON
// 		return res.status === 0 || res.type === "opaque";
// 	} catch {
// 		return true; // blocked
// 	}
// }

async function detectTrackerBlocking() {
	try {
		const res = await fetch("https://cors-test.codehappy.dev/ok.txt", {
			method: "GET",
			mode: "cors",
			cache: "no-store",
		});

		if (!res.ok) throw new Error("Blocked or failed");

		return false; // no blocking
	} catch (e) {
		return true; // tracker blocked OR network blocked
	}
}

// Detect if WebSockets are blocked (generic)
function detectWebSocketBlocking() {
	return new Promise((resolve) => {
		let resolved = false;

		const ws = new WebSocket(`${window.location.origin.replace(/^http/, "ws")}/graphql`);

		const timer = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				resolve(true); // timeout = blocked
			}
		}, 1500);

		ws.onopen = () => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timer);
				ws.close();
				resolve(false); // works
			}
		};

		ws.onerror = () => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timer);
				resolve(true); // blocked
			}
		};
	});
}

// Main hook
export function usePrivacyGuard() {
	const [status, setStatus] = useState({
		brave: false,
		shieldsActive: false,
		wsBlocked: false,
		anyPrivacyBlocker: false,
		checked: false,
	});

	const runCheck = useCallback(async () => {
		const brave = await detectBrave();
		// const braveShields = await detectBraveShields();
		const wsBlocked = await detectWebSocketBlocking();
		const trackerBlocked = await detectTrackerBlocking();

		// setStatus({
		// 	brave,
		// 	shieldsActive: brave && braveShields,
		// 	wsBlocked,
		// 	anyPrivacyBlocker: wsBlocked || (brave && braveShields),
		// 	checked: true,
		// });

		setStatus({
			brave,
			wsBlocked,
			trackerBlocked,
			anyPrivacyBlocker: wsBlocked || trackerBlocked,
			shieldsActive: brave && (wsBlocked || trackerBlocked),
			checked: true,
		});
	}, []);

	useEffect(() => {
		runCheck();
	}, [runCheck]);

	return { ...status, recheck: runCheck };
}
