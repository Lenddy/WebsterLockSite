export const ROLE_PERMISSIONS = {
	// all permission (5)
	headAdmin: ["*"],

	// mostly all permission (4)
	admin: [
		// users
		"users:read:any",
		"users:create:any",
		"users:update:any",
		"users:delete:any",
		// "users:update:peer",

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

	// permissions can be given (3)
	subAdmin: [
		// users
		"users:read:any",
		"users:update:own",

		// requests
		"requests:read:any",
		"requests:create:any",
		"requests:update:any",
		"requests:delete:own",

		// items
		"items:read:any",
	],

	// limited to own updates (2)
	user: [
		// users
		"users:read:own",
		"users:update:own",

		// requests
		"requests:read:own",
		"requests:create:own",
		"requests:update:own",
		"requests:delete:own",

		// items
		"items:read:any",
	],

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

// export const PERMISSION_HIERARCHY = [
// 	["users:update:any", "users:update:own"],
// 	["users:delete:any", "users:delete:own"],
// 	["users:read:any", "users:read:own"],

// 	["requests:update:any", "requests:update:own"],
// 	["requests:delete:any", "requests:delete:own"],
// 	["requests:read:any", "requests:read:own"],

// 	["peers:update:any", "peers:update:own"],
// 	["peers:delete:any", "peers:delete:own"],
// ];
