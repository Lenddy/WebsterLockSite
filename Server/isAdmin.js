import { ROLE_PERMISSIONS } from "./role.config.js";

export const can = (user, permission, { ownerId, targetRole } = {}) => {
	// headAdmin has unrestricted access
	if (user?.role === "headAdmin") return true;

	const rolePerms = ROLE_PERMISSIONS[user?.role] || [];
	const userPerms = user?.permissions || [];
	const allPerms = new Set([...rolePerms, ...userPerms]);

	// Global wildcard
	if (allPerms.has("*")) return true;

	// If user has update:any, it also satisfies update:own
	if (permission.endsWith(":own") && allPerms.has(permission.replace(":own", ":any"))) {
		return true;
	}

	// peer permission
	if (permission.endsWith(":peer")) {
		return allPerms.has(permission) && user.role === targetRole;
	}

	// Own-resource permission check
	if (permission.endsWith(":own")) {
		return ownerId && String(user.userId) === String(ownerId) && allPerms.has(permission);
	}

	return allPerms.has(permission);
};

export const mergePermissions = (rolePermissions = [], extraPermissions = []) => {
	const map = Object.create(null);

	for (const perm of rolePermissions) {
		const [r, a] = perm.split(":", 2);
		if (r && a) map[`${r}:${a}`] = perm;
	}

	for (const perm of extraPermissions) {
		const [r, a] = perm.split(":", 2);
		if (r && a) map[`${r}:${a}`] = perm;
	}

	return Object.values(map);
};
