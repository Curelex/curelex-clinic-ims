import useAuth from "./useAuth";

const usePermissions = () => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const isAdmin = user?.role === "admin";

  const can = (permission) => isAdmin || permissions.includes(permission);

  return {
    isAdmin,
    can
  };
};

export default usePermissions;
