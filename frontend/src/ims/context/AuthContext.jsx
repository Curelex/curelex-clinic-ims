import { createContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getMe, login as loginApi, signup as signupApi } from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("ims_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await getMe();
        setUser(currentUser);
      } catch (error) {
        localStorage.removeItem("ims_token");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (payload) => {
    const data = await loginApi(payload);
    localStorage.setItem("ims_token", data.token);
    setUser(data.user);
    toast.success("Logged in");
  };

  const signup = async (payload) => {
    const data = await signupApi(payload);
    localStorage.setItem("ims_token", data.token);
    setUser(data.user);
    toast.success("Account created");
  };

  const logout = () => {
    localStorage.removeItem("ims_token");
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
