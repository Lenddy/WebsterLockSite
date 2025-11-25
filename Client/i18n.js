import i18n from "i18next"; //, { reloadResources }
import { initReactI18next, Translation } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
// import HttpApi from "i18next-http-backend";
import HttpBackend from "i18next-http-backend";
// import en from "../Server/locales/en/translation.json";
// import es from "../Server/locales/es/translation.json";
// import es from "./i18n/es/translation.json";

//! old way  does it still works ?

// i18n.use(initReactI18next) // passes i18n down to react-i18next
// 	.use(LanguageDetector)
// 	.use(HttpApi)
// 	.init({
// 		supportedLngs: ["en", "es"],
// 		fallbackLng: "en",
// 		detection: {
// 			order: ["cookie", "htmlTag", "localStorage", "path", "subdomain"],
// 			caches: ["cookie"],
// 		},
// 		backend: {
// 			// components/
// 			loadPath: "/languages/{{lng}}/translation.json",
// 		},
// 		react: { useSuspense: false },
// 	});

i18n.use(initReactI18next) // passes i18n down to react-i18next
	.use(LanguageDetector)
	.use(HttpBackend)
	.init({
		debug: true,
		fallbackLng: "en",

		interpolation: {
			escapeValue: false,
		},
		// resources: {
		// 	en: {
		// 		translation: en,
		// 	},
		// 	es: {
		// 		translation: es,
		// 	},
		// },
		backend: {
			loadPath: "http://localhost:3005/locales/{{lng}}/{{ns}}.json",
		},
	});

export default i18n;
