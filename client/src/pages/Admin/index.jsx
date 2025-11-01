import { NavLink, Outlet } from "react-router-dom";
import AdminGate from "../../components/AdminGate.jsx";

export default function AdminLayout(){
  return (
    <AdminGate fallback={<div className="p-6">You do not have access to admin.</div>}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Admin</h1>
        <nav className="flex gap-3 mb-6">
          <NavLink to="users" className="underline">Users</NavLink>
          <NavLink to="products" className="underline">Products</NavLink>
        </nav>
        <Outlet />
      </div>
    </AdminGate>
  );
}
