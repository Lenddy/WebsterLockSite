import { ROLE_PERMISSIONS } from "./role.config.js";

export const can = (user, permission, { ownerId, targetRole } = {}) => {
	// headAdmin has unrestricted access
	if (user?.role === "headAdmin") return true;
	console.log("this is the users info ", user);

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
	if (permission.startsWith("peers") && permission.endsWith(":any")) {
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
