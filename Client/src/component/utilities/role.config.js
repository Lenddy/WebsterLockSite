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
		"users:read:own",
		"users:update:own",
		// requests
		"requests:create:any",
		"requests:update:any",
		// items
	],

	// limited to own updates (2)
	user: [
		// users
		"users:read:own",
		"users:update:own",
		// requests
		"requests:create:own",
		"requests:update:own",
		// items
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
