// AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [userToken, setUserToken] = useState(null);
	const [loading, setLoading] = useState(true); // auth initialization loading
	const [pageLoading, setPageLoading] = useState(false); // <-- NEW: track app/page data loading

	// Load token from localStorage on first mount
	useEffect(() => {
		const storedToken = localStorage.getItem("UserToken");
		if (storedToken) {
			setUserToken(storedToken);
		}
		setLoading(false); // done initializing
	}, []);

	// Sync changes to localStorage
	useEffect(() => {
		if (userToken) {
			localStorage.setItem("UserToken", userToken);
		} else {
			localStorage.removeItem("UserToken");
		}
	}, [userToken]);

	return (
		<AuthContext.Provider
			value={{
				userToken,
				setUserToken,
				loading, // auth loading
				pageLoading, // <-- new
				setPageLoading, // <-- new
			}}>
			{children}
		</AuthContext.Provider>
	);
};

// custom hook
export const useAuth = () => useContext(AuthContext);

// import React, { createContext, useState, useEffect, useContext } from "react";

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
// 	const [userToken, setUserToken] = useState(null);
// 	const [loading, setLoading] = useState(true); //  new

// 	// Load token from localStorage on first mount
// 	useEffect(() => {
// 		const storedToken = localStorage.getItem("UserToken");
// 		if (storedToken) {
// 			setUserToken(storedToken);
// 		}
// 		setLoading(false); //  done initializing
// 	}, []);

// 	// Sync changes to localStorage
// 	useEffect(() => {
// 		if (userToken) {
// 			localStorage.setItem("UserToken", userToken);
// 		} else {
// 			localStorage.removeItem("UserToken");
// 		}
// 	}, [userToken]);

// 	return <AuthContext.Provider value={{ userToken, setUserToken, loading }}>{children}</AuthContext.Provider>;
// };

// // custom hook
// export const useAuth = () => useContext(AuthContext);
