import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ChainedBackend from "i18next-chained-backend";
import HttpBackend from "i18next-http-backend";
import ResourcesToBackend from "i18next-resources-to-backend";

import en from "./locales/en/translation.json";
import es from "./locales/es/translation.json";

i18n.use(initReactI18next)
	.use(LanguageDetector)
	.use(ChainedBackend)
	.init({
		debug: true,
		fallbackLng: "en",
		load: "languageOnly",

		interpolation: {
			escapeValue: false,
		},

		backend: {
			backends: [
				HttpBackend, //  try backend first
				ResourcesToBackend({
					en: { translation: en },
					es: { translation: es },
				}), //  frontend fallback
			],
			backendOptions: [
				{
					loadPath: `${import.meta.env.VITE_TRANSLATION_URL}/locales/{{lng}}/{{ns}}.json`,
				},
				{}, // ResourcesToBackend needs no options
			],
		},
	});

// i18n.use(initReactI18next) // passes i18n down to react-i18next
// 	.use(LanguageDetector)
// 	.use(HttpBackend)
// 	.init({
// 		debug: true,
// 		fallbackLng: "en",
// 		load: "languageOnly",
// 		interpolation: {
// 			escapeValue: false,
// 		},
// 		// resources: {
// 		// 	en: {
// 		// 		translation: en,
// 		// 	},
// 		// 	es: {
// 		// 		translation: es,
// 		// 	},
// 		// },
// 		backend: {
// 			loadPath: `${import.meta.env.VITE_TRANSLATION_URL}/locales/{{lng}}/{{ns}}.json`,
// 		},
// 	});

console.log("this is  the language route", `${import.meta.env.VITE_TRANSLATION_URL}/locales/{{lng}}/{{ns}}.json`);

export default i18n;
