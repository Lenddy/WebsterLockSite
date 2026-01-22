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
		"requests:delete:own",
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
