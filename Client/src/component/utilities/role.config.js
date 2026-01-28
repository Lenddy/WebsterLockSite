// import { useTranslation } from "react-i18next";
// const { t } = useTranslation();

export const ROLE_PERMISSIONS = {
	// all permission (5)
	headAdmin: {
		permissions: ["*"],
		description: "Is allowed to perform all actions.",
	},
	// mostly all permission (4)
	admin: {
		permissions: [
			// users
			"users:read:any",
			"users:create:any",
			"users:update:any",
			"users:delete:any",

			// requests
			"requests:read:any",
			"requests:create:any",
			"requests:update:any",
			"requests:delete:any",

			// items
			"items:read:any",
			"items:create:any",
			"items:update:any",
			"items:delete:any",

			// roles
			"role:change:any",
		],
		description: "Is allowed to create, update, and delete all users, requests, and items, and change roles by default.",
	},

	// permissions can be given (3)
	subAdmin: {
		permissions: [
			// users
			"users:read:own",
			"users:update:own",
			// requests
			"requests:read:any",
			"requests:create:any",
			"requests:update:any",
			// items
		],

		description: "Is allowed to view, create and update requests and update their profile by default.",
	},

	// limited to own updates (2)
	user: {
		permissions: [
			// users
			"users:read:own",
			"users:update:own",
			// requests
			"requests:read:own",
			"requests:create:own",
			"requests:update:own",
			"requests:delete:own",
			// items
		],

		description: "Is allowed to create, update, and delete their own requests and update their profile by default.",
	},

	// not role given (1)
	noRole: {
		permissions: [
			// users
			"users:read:own",
			"users:update:own",
		],
		description: "Role to be determine later, can only update and view profile",
	},
};

// export const ROLE_PERMISSIONS = {
// 	// all permission (5)
// 	headAdmin:["*"],

// 	// mostly all permission (4)
// 	admin:[
// 			// users
// 			"users:read:any",
// 			"users:create:any",
// 			"users:update:any",
// 			"users:delete:any",

// 			// requests
// 			"requests:read:any",
// 			"requests:create:any",
// 			"requests:update:any",
// 			"requests:delete:any",

// 			// items
// 			"items:read:any",
// 			"items:create:any",
// 			"items:update:any",
// 			"items:delete:any",

// 			// roles
// 			"role:change:any",
// 		],

// 	// permissions can be given (3)
// 	subAdmin:[
// 			// users
// 			"users:read:own",
// 			"users:update:own",
// 			// requests
// 			"requests:create:any",
// 			"requests:update:any",
// 			// items
// 		],

// 	// limited to own updates (2)
// 	user:[
// 			// users
// 			"users:read:own",
// 			"users:update:own",
// 			// requests
// 			"requests:read:own",
// 			"requests:create:own",
// 			"requests:update:own",
// 			"requests:delete:own",
// 			// items
// 		],

// 	// not role given (1)
// 	noRole:
// 		[
// 			// users
// 			"users:read:own",
// 			"users:update:own",
// 		],
// };

export const roleRank = {
	headAdmin: 5,
	admin: 4,
	subAdmin: 3,
	user: 2,
	noRole: 1,
};

export const ALL_PERMISSIONS = ["users:read:any", "users:read:own", "users:create:any", "users:update:any", "users:update:own", "users:delete:any", "users:delete:own", "peers:update:any", "requests:read:any", "requests:read:own", "requests:create:any", "requests:create:own", "requests:update:any", "requests:update:own", "requests:delete:any", "requests:delete:own", "items:read:any", "items:create:any", "items:update:any", "items:delete:any", "role:change:any"];

// export const scopeDisplayName = (scope) => {
// 	const map = {
// 		"users:read:any": "View all users", //,
// 		"users:read:own": "View my profile",

// 		"users:create:any": "Create users",

// 		"users:update:any": "Edit any user",
// 		"users:update:own": "Edit my profile",

// 		"users:delete:any": "Delete any user",
// 		"users:delete:own": "Delete my account",

// 		"peers:update:any": "Edit users with the same role",

// 		"role:change:any": "Change user roles",

// 		"requests:read:any": "View all requests",
// 		"requests:read:own": "View my requests",

// 		"requests:create:any": "Create requests for anyone",
// 		"requests:create:own": "Create my own requests",

// 		"requests:update:any": "Edit any request",
// 		"requests:update:own": "Edit my requests",

// 		"requests:delete:any": "Delete any request",
// 		"requests:delete:own": "Delete my requests",

// 		"items:read:any": "View all items",
// 		"items:create:any": "Create items",
// 		"items:update:any": "Edit items",
// 		"items:delete:any": "Delete items",
// 	};

// 	return map[scope] ?? scope;
// };

export const scopeDisplayName = (scope, t) => {
	const map = {
		"users:read:any": t("permissionsList.users.read.any"),
		"users:read:own": t("permissionsList.users.read.own"),

		"users:create:any": t("permissionsList.users.create.any"),

		"users:update:any": t("permissionsList.users.update.any"),
		"users:update:own": t("permissionsList.users.update.own"),

		"users:delete:any": t("permissionsList.users.delete.any"),
		"users:delete:own": t("permissionsList.users.delete.own"),

		"peers:update:any": t("permissionsList.peers.update.any"),

		"role:change:any": t("permissionsList.role.change.any"),

		"requests:read:any": t("permissionsList.requests.read.any"),
		"requests:read:own": t("permissionsList.requests.read.own"),

		"requests:create:any": t("permissionsList.requests.create.any"),
		"requests:create:own": t("permissionsList.requests.create.own"),

		"requests:update:any": t("permissionsList.requests.update.any"),
		"requests:update:own": t("permissionsList.requests.update.own"),

		"requests:delete:any": t("permissionsList.requests.delete.any"),
		"requests:delete:own": t("permissionsList.requests.delete.own"),

		"items:read:any": t("permissionsList.items.read.any"),
		"items:create:any": t("permissionsList.items.create.any"),
		"items:update:any": t("permissionsList.items.update.any"),
		"items:delete:any": t("permissionsList.items.delete.any"),
	};

	return map[scope] ?? scope;
};

export const PERMISSION_DEPENDENCIES = {
	"users:update:any": ["users:read:any"],
	"users:delete:any": ["users:read:any", "users:update:any"],

	"users:update:own": ["users:read:own"],
	"users:delete:own": ["users:read:own", "users:update:own"],

	"requests:update:any": ["requests:read:any"],
	"requests:delete:any": ["requests:read:any", "requests:update:any"],

	"requests:update:own": ["requests:read:own"],
	"requests:delete:own": ["requests:read:own", "requests:update:own"],
};

//  users:read:any also satifies for when you need users:read:own the same goes
