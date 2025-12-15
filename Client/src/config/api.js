export const API_ORIGIN =
	typeof window !== "undefined" && (window.location.hostname == "localhost" || window.location.hostname.includes("test"))
		? "https://webster-lock-services-test.onrender.com" // local dev or test site
		: "https://webster-lock-services.onrender.com"; // actual production site

// export const API_ORIGIN = typeof window !== "undefined" && window.location.hostname.includes("test") ? "https://webster-lock-services-test.onrender.com" : "https://webster-lock-services.onrender.com";

// export const API_ORIGIN = typeof window !== "undefined" && window.location.hostname.includes("localhost") ? "http://localhost:8080" : window.location.hostname.includes("test") ? "https://webster-lock-services-test.onrender.com" : "https://webster-lock-services.onrender.";

// const API_ORIGIN = location.hostname.includes("localhost") ? "http://localhost:8080" : location.hostname.includes("test") ? "https://webster-lock-services-test.onrender.com" : "https://webster-lock-services.onrender.";

export const GRAPHQL_URL = `${API_ORIGIN}/graphql`;
