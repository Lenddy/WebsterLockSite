import User from "./models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const seedMarkerPath = path.resolve("./.seeded_admin"); // local marker file

export const seedAdmin = async () => {
	try {
		// --- Step 1: Prevent rerun in prod or after initial seed ---
		if (process.env.NODE_ENV === "PORDUCTION" && fs.existsSync(seedMarkerPath)) {
			console.log(" Seed skipped: admin already initialized in production.");
			return;
		}

		// --- Step 2: Check database ---
		const existingAdmin = await User.findOne({ role: "headAdmin" });
		if (existingAdmin) {
			console.log(" Head admin already exists:", existingAdmin.email);
			// Create marker if not exists
			if (!fs.existsSync(seedMarkerPath)) fs.writeFileSync(seedMarkerPath, "Seeded on " + new Date().toISOString());
			return;
		}

		// --- Step 3: Create admin ---

		const admin = new User({
			name: "System Admin",
			email: process.env.ADMIN_EMAIL,
			password: process.env.ADMIN_PASS,
			confirmPassword: process.env.ADMIN_PASS,
			role: "headAdmin",
			job: {
				title: "System Admin",
				description: "System Admin",
			},
			permissions: {
				canEditUsers: true,
				canDeleteUsers: true,
				canChangeRole: true,
				canViewUsers: true,
				canViewAllUsers: true,
				canEditSelf: true,
				canViewSelf: true,
				canDeleteSelf: true,
				canRegisterUser: true,
			},
		});

		const token = jwt.sign(
			{
				userId: admin.id,
				name: admin.name,
				email: admin.email,
				role: admin.role,
				permissions: admin.permissions,
			},
			process.env.Secret_Key
		);

		admin.token = token;
		const res = await admin.save();

		// --- Step 4: Create marker file ---
		fs.writeFileSync(seedMarkerPath, "Seeded on " + new Date().toISOString());

		console.log(" Head admin created successfully:", res.email);
	} catch (err) {
		console.error(" Error creating head admin:", err.message);
	}
};

// Run only when this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
	seedAdmin();
}

// import User from "./models/user.model.js";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcrypt";

// export const seedAdmin = async () => {
// 	try {
// 		// Check if a head admin already exists
// 		const existingAdmin = await User.findOne({ role: "headAdmin" });
// 		if (existingAdmin) {
// 			console.log("🟢 Head admin already exists:", existingAdmin.email);
// 			return;
// 		}

// 		// Hash password
// 		const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASS, 10);

// 		// Create admin user
// 		const admin = new User({
// 			name: "System Admin",
// 			email: process.env.ADMIN_EMAIL,
// 			password: hashedPassword,
// 			confirmPassword: hashedPassword,
// 			role: "headAdmin",
// 			job: {
// 				title: "System Admin",
// 				description: "System Admin",
// 			},
// 			permissions: {
// 				canEditUsers: true,
// 				canDeleteUsers: true,
// 				canChangeRole: true,
// 				canViewUsers: true,
// 				canViewAllUsers: true,
// 				canEditSelf: true,
// 				canViewSelf: true,
// 				canDeleteSelf: true,
// 				canNotBeDeleted: true,
// 				canNotBeUpdated: true,
// 				canRegisterUser: true,
// 			},
// 		});

// 		// Generate token for admin
// 		const token = jwt.sign(
// 			{
// 				userId: admin.id,
// 				name: admin.name,
// 				email: admin.email,
// 				role: admin.role,
// 				permissions: admin.permissions,
// 			},
// 			process.env.Secret_Key
// 		);

// 		admin.token = token;

// 		// Save admin to DB
// 		const res = await admin.save();

// 		console.log("Head admin created successfully:", res.email);
// 		return {
// 			id: res.id,
// 			...res._doc,
// 		};
// 	} catch (err) {
// 		console.error(" Error creating head admin:", err.message);
// 	}
// };

// // Run automatically if this file is imported directly
// if (import.meta.url === `file://${process.argv[1]}`) {
// 	seedAdmin();
// }
