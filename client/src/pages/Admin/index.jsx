import { NavLink, Outlet } from "react-router-dom";
import AdminGate from "../../components/AdminGate.jsx";

export default function AdminLayout(){
  return (
    <AdminGate fallback={<div className="p-6">You do not have access to admin.</div>}>
      <div className="container-page py-4">
        <h1 className="text-2xl font-bold mb-4">Admin</h1>
        <div className="admin-shell">
          <aside className="sidebar card">
            <nav className="flex flex-col gap-1">
              <NavLink to="." end className={({isActive})=>isActive?"active":""}>Dashboard</NavLink>
              <NavLink to="orders" className={({isActive})=>isActive?"active":""}>Orders</NavLink>
              <NavLink to="products" className={({isActive})=>isActive?"active":""}>Products</NavLink>
              <NavLink to="users" className={({isActive})=>isActive?"active":""}>Users</NavLink>
              <NavLink to="settings" className={({isActive})=>isActive?"active":""}>Settings</NavLink>
            </nav>
          </aside>
          <main className="min-h-[50vh]">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
