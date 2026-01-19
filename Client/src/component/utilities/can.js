import { ROLE_PERMISSIONS, roleRank } from "./role.config.js";

export const can = (user, permission, { ownerId, targetRole } = {}) => {
	// console.log("ownerId", ownerId);
	// console.log("target role", targetRole);
	// headAdmin has unrestricted access
	if (user?.role === "headAdmin") return true;

	const rolePerms = ROLE_PERMISSIONS[user?.role] || [];
	const userPerms = user?.permissions || [];
	const allPerms = new Set([...rolePerms, ...userPerms]);
	// console.log("this is from ")

	// console.log("CAN CHECK", {
	// 	role: user?.role,
	// 	permission,
	// 	rolePerms: ROLE_PERMISSIONS[user?.role],
	// 	userPerms: user?.permissions,
	// 	allPerms: [...allPerms],
	// 	hasPermission: allPerms.has(permission),
	// 	ownerId,
	// 	targetRole,
	// });

	// console.log("checking peer permission");
	// console.log("checking if current users has the given permission", allPerms.has(permission));
	// console.log("checking what user.role === target role is  ", user.role === targetRole);
	// console.log("checking what user.role !== target role is  ", user.role !== targetRole);
	// console.log("seeing what rank is the user", roleRank[user.role]);
	// console.log("seeing what target is", targetRole);
	// console.log("seeing what rank is the target", roleRank[targetRole]);
	// console.log("seeing what i get if i compare  the ranks  ", roleRank[user.role] > roleRank[targetRole]);
	// console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

	// Global wildcard
	if (allPerms.has("*")) return true;

	if (permission.endsWith("any:peer")) {
		return true;
	}

	// If user has update:any, it also satisfies update:own
	// || allPerms.has(permission.replace(":own", ":peer"))
	if (permission.endsWith(":own") && allPerms.has(permission.replace(":own", ":any") || allPerms.has(permission.replace(":own", ":peer")))) {
		return true;
	}

	// peer permission
	// && allPerms.has(permission.replace(":peer", ":any"))

	// if (permission.endsWith(":peer")) {
	// 	// if (permission.endsWith(":peer")) {
	// 	// console.log("peer permission found");
	// 	// console.log("check", allPerms.has(permission) && user.role === targetRole);
	// 	if (rolePerms[user.role] > roleRank[targetRole]) return true;
	// 	else return false;
	// 	// return allPerms.has(permission) &&  !== targetRole;
	// 	// return roleRank[user.role] > roleRank[targetRole];
	// }

	// Own-resource permission check
	if (permission.endsWith(":own")) {
		return ownerId && String(user.userId) === String(ownerId) && allPerms.has(permission);
	}

	return allPerms.has(permission);
};

// export const can = (user, permission, { ownerId } = {}) => {
// 	if (!user) return false;

// 	// headAdmin bypass
// 	if (user.role === "headAdmin") return true;

// 	const rolePerms = (ROLE_PERMISSIONS[user.role] || []).map((p) => p.trim());
// 	const userPerms = (user.permissions || []).map((p) => p.trim());
// 	const allPerms = new Set([...rolePerms, ...userPerms]);

// 	// wildcard
// 	if (allPerms.has("*")) return true;

// 	// own satisfied by any or peer
// 	if (permission.endsWith(":own")) {
// 		if (allPerms.has(permission.replace(":own", ":any"))) return true;
// 		if (allPerms.has(permission.replace(":own", ":peer"))) return true;
// 		return ownerId && String(user.userId) === String(ownerId) && allPerms.has(permission);
// 	}

// 	return allPerms.has(permission);
// };
