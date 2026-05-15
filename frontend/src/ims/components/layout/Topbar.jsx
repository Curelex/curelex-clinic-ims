import useAuth from "../../hooks/useAuth";

const Topbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-brand-100 bg-white/80 px-4 py-3 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-widest text-brand-600">Inventory Management System</p>
        <h2 className="text-lg font-semibold text-slate-900">Welcome, {user?.fullName}</h2>
      </div>
      <button
        onClick={logout}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Logout
      </button>
    </header>
  );
};

export default Topbar;
