import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [userToken, setUserToken] = useState(null);
	const [loading, setLoading] = useState(true); //  new

	// Load token from localStorage on first mount
	useEffect(() => {
		const storedToken = localStorage.getItem("UserToken");
		if (storedToken) {
			setUserToken(storedToken);
		}
		setLoading(false); //  done initializing
	}, []);

	// Sync changes to localStorage
	useEffect(() => {
		if (userToken) {
			localStorage.setItem("UserToken", userToken);
		} else {
			localStorage.removeItem("UserToken");
		}
	}, [userToken]);

	return <AuthContext.Provider value={{ userToken, setUserToken, loading }}>{children}</AuthContext.Provider>;
};

// custom hook
export const useAuth = () => useContext(AuthContext);

// import React, { createContext, useState, useEffect, useContext } from "react";

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
// 	const [userToken, setUserToken] = useState(null);

// 	//  Load token from localStorage on first mount
// 	useEffect(() => {
// 		const storedToken = localStorage.getItem("UserToken");
// 		if (storedToken) {
// 			setUserToken(storedToken);
// 		}
// 	}, []);

// 	// Whenever userToken changes, sync it to localStorage
// 	useEffect(() => {
// 		if (userToken) {
// 			localStorage.setItem("UserToken", userToken);
// 		} else {
// 			localStorage.removeItem("UserToken");
// 		}
// 	}, [userToken]);

// 	return <AuthContext.Provider value={{ userToken, setUserToken }}>{children}</AuthContext.Provider>;
// };

// // Simple custom hook for cleaner access
// export const useAuth = () => useContext(AuthContext);

// !!!!!!
// !!!!!!
// !!!!!!
// old
// !!!!!!
// !!!!!!
// !!!!!!
// import { createContext, useContext, useEffect, useState } from "react";

// import jwtDecode from "jwt-decode";

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
// 	const [user, setUser] = useState(null);
// 	const [loading, setLoading] = useState(true);

// 	// Load token from localStorage on startup
// 	useEffect(() => {
// 		const token = localStorage.getItem("token");
// 		if (token) {
// 			try {
// 				const decoded = jwtDecode(token);
// 				setUser({ ...decoded, token });
// 			} catch (error) {
// 				console.error("Invalid token:", error);
// 				localStorage.removeItem("token");
// 			}
// 		}
// 		setLoading(false);
// 	}, []);

// 	const login = (token) => {
// 		localStorage.setItem("token", token);
// 		const decoded = jwtDecode(token);
// 		setUser({ ...decoded, token });
// 	};

// 	const logout = () => {
// 		localStorage.removeItem("token");
// 		setUser(null);
// 	};

// 	return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
// };

// export const useAuth = () => useContext(AuthContext);
