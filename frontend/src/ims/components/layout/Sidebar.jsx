import { NavLink } from "react-router-dom";
import usePermissions from "../../hooks/usePermissions";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Products", adminOnly: true },
  { to: "/inventory", label: "Inventory", adminOnly: true },
  { to: "/sales", label: "Sales" },
  { to: "/purchases", label: "Purchases", adminOnly: true },
  { to: "/customers", label: "Customers" },
  { to: "/suppliers", label: "Suppliers", adminOnly: true },
  { to: "/reports", label: "Reports" }
];

const Sidebar = () => {
  const { isAdmin } = usePermissions();

  return (
    <aside className="w-full border-r border-brand-100 bg-white/70 p-4 backdrop-blur lg:w-64">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Retail IMS</h1>
      <nav className="space-y-1">
        {navItems
          .filter((item) => (item.adminOnly ? isAdmin : true))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-brand-500 text-white" : "text-slate-700 hover:bg-brand-50"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
