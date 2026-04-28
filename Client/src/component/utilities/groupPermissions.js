export const groupPermissions = (permissions) => {
	const result = {};

	permissions.forEach((perm) => {
		let [resource, action, scope] = perm.split(":");
		// console.log("resource:", resource, "action:", action, "scope:", scope);
		// role permissions belong to users column
		if (resource === "role" || resource === "peers") {
			resource = "users";
		}

		if (!result[resource]) {
			result[resource] = {};
		}

		const actionKey = action;

		if (!result[resource][actionKey]) {
			result[resource][actionKey] = {
				action,
				perms: [],
			};
		}

		result[resource][actionKey].perms.push({
			perm,
			scope,
		});
	});

	// console.log(result);
	return result;
};
