import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
// #b5a642
export default defineConfig({
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
						urlPattern: ({ url }) => url.origin === import.meta.env.VITE_API_URL.replace(/\/graphql$/, ""),
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
});

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import svgr from "vite-plugin-svgr";
// import { VitePWA } from "vite-plugin-pwa";
// // import vitePluginSvgr from "vite-plugin-svgr";

// // https://vite.dev/config/
// export default defineConfig({
// 	plugins: [
// 		react(),
// 		svgr(),
// 		VitePWA({
// 			registerType: "autoUpdate",
// 			manifest: {
// 				name: "Webster Lock & Hardware",
// 				short_name: "Webster-Lock",
// 				description: "Webster Lock & Hardware is an app that initially allow you to make material request(app is subjected to change either in its functionality or name) made by Lenddy Morales",
// 				theme_color: "#ffffff",
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
// 		}),
// 	],
// });
