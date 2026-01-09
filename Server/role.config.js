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
