module.exports = {
	input: [
		"src/**/*.{js,jsx}",
		// Use ! to filter out files or directories
		"!src/**/*.spec.{js,jsx}",
		"!i18n/**",
		"!**/node_modules/**",
	],
	// output: "./",
	output: "../Server/",
	options: {
		compatibilityJSON: "v3",
		debug: true,
		func: {
			list: ["i18next.t", "i18n.t", "t"],
			extensions: [".js", ".jsx"],
		},
		trans: {
			extensions: [".js", ".jsx"],
		},
		lngs: ["en", "es"],
		ns: ["translation"],
		defaultLng: "en",
		defaultNs: "translation",
		resource: {
			// loadPath: "i18n/{{lng}}/{{ns}}.json",
			// savePath: "i18n/{{lng}}/{{ns}}.json",
			loadPath: "../Server/locales/{{lng}}/{{ns}}.json",
			savePath: "../Server/locales/{{lng}}/{{ns}}.json",
			jsonIndent: "\t",
		},
	},
};

// module.exports = {
// 	input: ["src/**/*.{js,jsx}", "!src/**/*.spec.{js,jsx}", "!i18n/**", "!**/node_modules/**"],

// 	// This is fine
// 	output: "../Server/",

// 	options: {
// 		debug: true,
// 		compatibilityJSON: "v3",
// 		debug: true,

// 		// Prevent wiping existing keys
// 		removeUnusedKeys: false,
// 		saveMissing: true,

// 		func: {
// 			list: ["i18next.t", "i18n.t", "t"],
// 			extensions: [".js", ".jsx"],
// 		},
// 		trans: {
// 			extensions: [".js", ".jsx"],
// 		},

// 		lngs: ["en", "es"],
// 		ns: ["translation"],
// 		defaultLng: "en",
// 		defaultNs: "translation",

// 		resource: {
// 			// loadPath: "locales/{{lng}}/{{ns}}.json",
// 			// savePath: "locales/{{lng}}/{{ns}}.json",
// 			loadPath: "../Server/locales/{{lng}}/{{ns}}.json",
// 			savePath: "../Server/locales/{{lng}}/{{ns}}.json",
// 			jsonIndent: "\t",

// 			// keep the original values
// 			lineEnding: "\n",
// 		},
// 	},
// };
