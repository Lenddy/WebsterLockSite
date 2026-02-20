import { ROLE_PERMISSIONS, roleRank } from "./role.config.js";

// export const can = (user, permission, { ownerId, targetRole } = {}) => {
// 	// headAdmin has unrestricted access
// 	if (user?.role === "headAdmin") return true;

// 	const rolePerms = ROLE_PERMISSIONS[user?.role].permissions || [];
// 	const userPerms = user?.permissions || [];
// 	const allPerms = new Set([...rolePerms, ...userPerms]);

// 	// Global wildcard
// 	if (allPerms.has("*")) return true;

// 	// If user has update:any, it also satisfies update:own
// 	if (permission.endsWith(":own") && allPerms.has(permission.replace(":own", ":any"))) {
// 		return true;
// 	}

// 	// peer permission
// 	if (permission.startsWith("peers") && permission.endsWith(":any")) {
// 		return allPerms.has(permission) && user.role === targetRole;
// 	}

// 	// Own-resource permission check
// 	if (permission.endsWith(":own")) {
// 		return ownerId && String(user.userId) === String(ownerId) && allPerms.has(permission);
// 	}

// 	return allPerms.has(permission);
// };

export const can = (user, permission, { ownerId, targetRole } = {}) => {
	if (!user) return false;

	const userPerms = new Set(user.permissions || []);

	// headAdmin unrestricted
	if (user.role === "headAdmin") return true;

	// wildcard
	if (userPerms.has("*")) return true;

	// If user has update:any, it satisfies update:own
	if (permission.endsWith(":own") && userPerms.has(permission.replace(":own", ":any"))) {
		return true;
	}

	// peer permission
	if (permission.startsWith("peers") && permission.endsWith(":any")) {
		return userPerms.has(permission) && user.role === targetRole;
	}

	// own resource check
	if (permission.endsWith(":own")) {
		return ownerId && String(user.userId) === String(ownerId) && userPerms.has(permission);
	}

	return userPerms.has(permission);
};
