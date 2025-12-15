//!!! old
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import { GRAPHQL_URL } from "./src/config/api";
// #b5a642

// export com";

// export const GRAPHQL_URL = `${API_ORIGIN}/graphql`;

// Export a function instead of an object to access the mode and command
//  "https://webster-lock-services-test.onrender.com"
// "https://webster-lock-services.onrender.com";
export default ({ mode }) => {
	// Load environment variables based on the current mode (e.g., 'development', 'production')
	// The third argument '' ensures all env vars are loaded, not just those starting with VITE_
	// console.log("API URL as normal import :", import.meta.env.VITE_API_URL);
	// const env = loadEnv(mode, process.cwd(), "");

	// const API_ORIGIN = new URL(env.VITE_API_URL).origin;

	console.log("from the vite config ");
	// console.log("API URL:", env.VITE_API_URL);
	// console.log("API URL ori :", API_ORIGIN);

	// const API_ORIGIN = location.hostname.includes("localhost") ? "http://localhost:8080" : location.hostname.includes("test") ? "https://webster-lock-services-test.onrender.com" : "https://webster-lock-services.onrender.";

	// console.log("API URL ori :", API_ORIGIN);
	// console.log("API URL ori :", GRAPHQL_URL);
	return defineConfig({
		// 		define: {
		//     __API_ORIGIN__: JSON.stringify(
		// 		env.VITE_API_URL.replace(/\/graphql$/, "")
		//     //   "https://webster-lock-services-test.onrender.com"
		//     ),
		//   },
		plugins: [
			react(),
			svgr(),
			VitePWA({
				registerType: "autoUpdate",
				manifest: {
					name: "Webster Lock & Hardware",
					short_name: "Webster-Lock",
					description: "Webster Lock & Hardware is an app that allows you to make material requests. (Developed by Lenddy Morales)",
					theme_color: "#050510",
					background_color: "#050510",
					display: "standalone",
					start_url: "/material/request/all",
					icons: [
						{
							src: "/pwa-192x192.png",
							sizes: "192x192",
							type: "image/png",
							purpose: "any",
						},
						{
							src: "/pwa-512x512.png",
							sizes: "512x512",
							type: "image/png",
							purpose: "any",
						},
						{
							src: "/pwa-maskable-192x192.png",
							sizes: "192x192",
							type: "image/png",
							purpose: "maskable",
						},
						{
							src: "/pwa-maskable-512x512.png",
							sizes: "512x512",
							type: "image/png",
							purpose: "maskable",
						},
					],
				},

				workbox: {
					//  Cache static assets like JS/CSS
					globPatterns: ["**/*.{js,css,html,ico,png,svg}"],

					//  Handle API calls at runtime (GraphQL endpoint)
					runtimeCaching: [
						{
							// dynamically match your API endpoint
							// urlPattern: ({ url }) => url.origin === import.meta.env.VITE_API_URL.replace(/\/graphql$/, ""),

							// ({ url }) => url.origin === import.meta.env.VITE_API_URL.replace(/\/graphql$/, "")
							// urlPattern: env.VITE_BASE_PATH
							// urlPattern: ({ url }) => url.origin === env.VITE_API_URL.replace(/\/graphql$/, ""),
							// urlPattern: ({ url }) => url.origin === GRAPHQL_URL.replace(/\/graphql$/, ""),
							// urlPattern: "https://webster-lock-services-test.onrender.com",
							urlPattern: "https://webster-lock-services.onrender.com",
							handler: "NetworkFirst",
							options: {
								cacheName: "graphql-api-cache",
								networkTimeoutSeconds: 10,
								expiration: {
									maxEntries: 50,
									maxAgeSeconds: 60 * 5, // 5 minutes
								},
								cacheableResponse: {
									statuses: [0, 200],
								},
							},
						},
					],
				},
			}),
		],

		build: {
			minify: "esbuild",
			esbuild: {
				drop: ["console", "debugger"], // removes ALL console.* in production
			},
		},
	});
};

// defineConfig({
// 	plugins: [
// 		react(),
// 		svgr(),
// 		VitePWA({
// 			registerType: "autoUpdate",
// 			manifest: {
// 				name: "Webster Lock & Hardware",
// 				short_name: "Webster-Lock",
// 				description: "Webster Lock & Hardware is an app that allows you to make material requests. (Developed by Lenddy Morales)",
// 				theme_color: "#050510",
// 				background_color: "#050510",
// 				display: "standalone",
// 				start_url: "/material/request/all",
// 				icons: [
// 					{
// 						src: "/pwa-192x192.png",
// 						sizes: "192x192",
// 						type: "image/png",
// 						purpose: "any",
// 					},
// 					{
// 						src: "/pwa-512x512.png",
// 						sizes: "512x512",
// 						type: "image/png",
// 						purpose: "any",
// 					},
// 					{
// 						src: "/pwa-maskable-192x192.png",
// 						sizes: "192x192",
// 						type: "image/png",
// 						purpose: "maskable",
// 					},
// 					{
// 						src: "/pwa-maskable-512x512.png",
// 						sizes: "512x512",
// 						type: "image/png",
// 						purpose: "maskable",
// 					},
// 				],
// 			},

// 			workbox: {
// 				//  Cache static assets like JS/CSS
// 				globPatterns: ["**/*.{js,css,html,ico,png,svg}"],

// 				//  Handle API calls at runtime (GraphQL endpoint)
// 				runtimeCaching: [
// 					{
// 						// dynamically match your API endpoint
// 						// urlPattern: ({ url }) => url.origin === import.meta.env.VITE_API_URL.replace(/\/graphql$/, ""),
// 						urlPattern: "",
// 						handler: "NetworkFirst",
// 						options: {
// 							cacheName: "graphql-api-cache",
// 							networkTimeoutSeconds: 10,
// 							expiration: {
// 								maxEntries: 50,
// 								maxAgeSeconds: 60 * 5, // 5 minutes
// 							},
// 							cacheableResponse: {
// 								statuses: [0, 200],
// 							},
// 						},
// 					},
// 				],
// 			},
// 		}),
// 	],

// 	build: {
// 		minify: "esbuild",
// 		esbuild: {
// 			drop: ["console", "debugger"], // removes ALL console.* in production
// 		},
// 	},
// });

// !!!!!!!!!!!!!!!!

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import svgr from "vite-plugin-svgr";
// import { VitePWA } from "vite-plugin-pwa";

// export default defineConfig({
// 	plugins: [
// 		react(),
// 		svgr(),
// 		VitePWA({
// 			registerType: "autoUpdate",
// 			manifest: {
// 				name: "Webster Lock & Hardware",
// 				short_name: "Webster-Lock",
// 				description: "Webster Lock & Hardware is an app that allows you to make material requests. (Developed by Lenddy Morales)",
// 				theme_color: "#050510",
// 				background_color: "#050510",
// 				display: "standalone",
// 				start_url: "/material/request/all",
// 				icons: [
// 					{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
// 					{ src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
// 					{ src: "/pwa-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
// 					{ src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
// 				],
// 			},

// 			workbox: {
// 				globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
// 				runtimeCaching: [
// 					{
// 						urlPattern: ({ url }) => url.origin === import.meta.env.VITE_API_URL.replace(/\/graphql$/, ""),
// 						handler: "NetworkFirst",
// 						options: {
// 							cacheName: "graphql-api-cache",
// 							networkTimeoutSeconds: 10,
// 							expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
// 							cacheableResponse: { statuses: [0, 200] },
// 						},
// 					},
// 				],
// 			},
// 		}),
// 	],

// 	build: {
// 		minify: "esbuild",
// 		esbuild: {
// 			drop: ["console", "debugger"],
// 		},

// 		rollupOptions: {
// 			output: {
// 				manualChunks(id) {
// 					if (id.includes("node_modules")) {
// 						// Don't split React into separate chunks
// 						if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) {
// 							return "react-vendor";
// 						}

// 						return id.toString().split("node_modules/")[1].split("/")[0].toString();
// 					}
// 				},
// 			},
// 		},
// 	},
// });

// //!!!!!!! old 2
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import svgr from "vite-plugin-svgr";
// import { VitePWA } from "vite-plugin-pwa";

// export default defineConfig({
// 	plugins: [
// 		react(),
// 		svgr(),

// 		VitePWA({
// 			registerType: "autoUpdate",
// 			manifest: {
// 				name: "Webster Lock & Hardware",
// 				short_name: "Webster-Lock",
// 				description: "Webster Lock & Hardware is an app that allows you to make material requests. (Developed by Lenddy Morales)",
// 				theme_color: "#050510",
// 				background_color: "#050510",
// 				display: "standalone",
// 				display_override: "",
// 				start_url: "/material/request/all",
// 				icons: [
// 					{
// 						src: "/pwa-192x192.png",
// 						sizes: "192x192",
// 						type: "image/png",
// 						purpose: "any",
// 					},
// 					{
// 						src: "/pwa-512x512.png",
// 						sizes: "512x512",
// 						type: "image/png",
// 						purpose: "any",
// 					},
// 					{
// 						src: "/pwa-maskable-192x192.png",
// 						sizes: "192x192",
// 						type: "image/png",
// 						purpose: "maskable",
// 					},
// 					{
// 						src: "/pwa-maskable-512x512.png",
// 						sizes: "512x512",
// 						type: "image/png",
// 						purpose: "maskable",
// 					},
// 				],
// 			},
// 			workbox: {
// 				globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
// 				runtimeCaching: [
// 					{
// 						urlPattern: ({ url }) => url.origin === import.meta.env.VITE_API_URL.replace(/\/graphql$/, ""),
// 						handler: "NetworkFirst",
// 						options: {
// 							cacheName: "graphql-api-cache",
// 							networkTimeoutSeconds: 10,
// 							expiration: {
// 								maxEntries: 50,
// 								maxAgeSeconds: 60 * 5,
// 							},
// 							cacheableResponse: {
// 								statuses: [0, 200],
// 							},
// 						},
// 					},
// 				],
// 			},
// 		}),
// 	],

// 	build: {
// 		minify: "esbuild",
// 		esbuild: {
// 			drop: ["console", "debugger"], // removes ALL console.* in production
// 		},

// 		// rollupOptions: {
// 		// 	output: {
// 		// 		manualChunks(id) {
// 		// 			if (id.includes("node_modules")) {
// 		// 				return id.toString().split("node_modules/")[1].split("/")[0].toString();
// 		// 			}
// 		// 		},
// 		// 	},
// 		// },
// 	},
// });
