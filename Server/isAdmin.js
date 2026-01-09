import { ROLE_PERMISSIONS } from "./role.config.js";

// export const can = (user, permission, { ownerId } = {}) => {
// 	// headAdmin wildcard
// 	if (user?.role === "headAdmin") return true;

// 	const rolePerms = ROLE_PERMISSIONS[user?.role] || [];
// 	const userPerms = user?.permissions || [];

// 	// Merge role + user permissions
// 	const allPerms = new Set([...rolePerms, ...userPerms]);

// 	// Wildcard support
// 	if (allPerms?.has("*")) return true;
// 	if (allPerms?.has(permission?.replace(":own", ":any"))) return true;

// 	// Own vs any
// 	if (permission?.endsWith(":own")) {
// 		return ownerId && user?.userId?.equals(ownerId) && allPerms?.has(permission);
// 	}

// 	return allPerms?.has(permission);
// };

export const can = (user, permission, { ownerId } = {}) => {
	// headAdmin has unrestricted access
	if (user?.role === "headAdmin") return true;

	const rolePerms = ROLE_PERMISSIONS[user?.role] || [];
	// const userPerms = user?.permissions || [];
	const userPerms = [
		"users:update:own",
		// requests
		"requests:create:own",
		// items
		"requests:update:own",
	];

	// Combine role permissions and user-granted permissions
	const allPerms = new Set([...rolePerms, ...userPerms]);

	// Global wildcard
	if (allPerms.has("*")) return true;

	// If user has update:any, it also satisfies update:own
	if (permission.endsWith(":own") && allPerms.has(permission.replace(":own", ":any"))) {
		return true;
	}

	// Own-resource permission check
	if (permission.endsWith(":own")) {
		const sameUser = String(user?.userId) === String(ownerId);
		return sameUser && allPerms.has(permission);
	}

	// Direct permission match
	return allPerms.has(permission);
};
