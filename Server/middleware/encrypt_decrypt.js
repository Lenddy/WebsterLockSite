// const crypto = require("crypto");
import crypto from "crypto";
// Define encryption and decryption methods
const algorithm = "aes-256-cbc";
const secretKey = process.env.ENCRYPTION_SECRET_KEY;
const iv = crypto.randomBytes(16);

export const encrypt = (text) => {
	const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (text) => {
	const textParts = text.split(":");
	const iv = Buffer.from(textParts.shift(), "hex");
	const encryptedText = Buffer.from(textParts.join(":"), "hex");
	const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
};

export default { encrypt, decrypt };
