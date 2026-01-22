export const ROLE_PERMISSIONS = {
	// all permission (5)
	headAdmin: {
		permissions: ["*"],
		descriptions: "Is allow to do all the actions",
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
		descriptions: "Is allowed to create ,update and delete all (users,request,items) by default",
	},

	// permissions can be given (3)
	subAdmin: {
		permissions: [
			// users
			"users:read:own",
			"users:update:own",
			// requests
			"requests:create:any",
			"requests:update:any",
			// items
		],

		descriptions: "Is allowed to create ,update  (request) and update their profile by default",
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

		descriptions: "Is allowed to create ,update and delete their own (request) and update their profile by default",
	},

	// not role given (1)
	noRole: [
		// users
		"users:read:own",
		"users:update:own",
	],
};

export const roleRank = {
	headAdmin: 5,
	admin: 4,
	subAdmin: 3,
	user: 2,
	noRole: 1,
};

export const ALL_PERMISSIONS = ["users:read:any", "users:read:own", "users:create:any", "users:update:any", "users:update:own", "users:delete:any", "users:delete:own", "peers:update:any", "requests:read:any", "requests:read:own", "requests:create:any", "requests:create:own", "requests:update:any", "requests:update:own", "requests:delete:any", "requests:delete:own", "items:read:any", "items:create:any", "items:update:any", "items:delete:any", "role:change:any"];

export const scopeDisplayName = (scope) => {
	const map = {
		"users:read:any": "View all users",
		"users:read:own": "View my profile",

		"users:create:any": "Create users",

		"users:update:any": "Edit any user",
		"users:update:own": "Edit my profile",

		"users:delete:any": "Delete any user",
		"users:delete:own": "Delete my account",

		"peers:update:any": "Edit users with the same role",

		"role:change:any": "Change user roles",

		"requests:read:any": "View all requests",
		"requests:read:own": "View my requests",

		"requests:create:any": "Create requests for anyone",
		"requests:create:own": "Create my own requests",

		"requests:update:any": "Edit any request",
		"requests:update:own": "Edit my requests",

		"requests:delete:any": "Delete any request",
		"requests:delete:own": "Delete my requests",

		"items:read:any": "View all items",
		"items:create:any": "Create items",
		"items:update:any": "Edit items",
		"items:delete:any": "Delete items",
	};

	return map[scope] ?? scope;
};

export const Role_description = {};
