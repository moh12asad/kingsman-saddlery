import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import AdminGate from "../../../components/AdminGate.jsx";

export default function OrdersManagementLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <AdminGate fallback={<div className="p-6">You do not have access to orders management.</div>}>
      <div className="container-page py-4" style={{ maxWidth: "95%", width: "100%" }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden btn btn-secondary btn-sm"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="admin-shell items-start">
          <aside className={`sidebar card ${menuOpen ? 'open' : ''} lg:block`}>
            <nav className="flex flex-col gap-1">
              <NavLink 
                to="." 
                end 
                className={({isActive})=>isActive?"active":""} 
                onClick={() => setMenuOpen(false)}
              >
                All Orders
              </NavLink>
              <NavLink 
                to="new" 
                className={({isActive})=>isActive?"active":""} 
                onClick={() => setMenuOpen(false)}
              >
                New Orders
              </NavLink>
              <NavLink 
                to="in-progress" 
                className={({isActive})=>isActive?"active":""} 
                onClick={() => setMenuOpen(false)}
              >
                In Progress
              </NavLink>
              <NavLink 
                to="ready" 
                className={({isActive})=>isActive?"active":""} 
                onClick={() => setMenuOpen(false)}
              >
                Ready
              </NavLink>
              <NavLink 
                to="delivery" 
                className={({isActive})=>isActive?"active":""} 
                onClick={() => setMenuOpen(false)}
              >
                Out for Delivery
              </NavLink>
              <NavLink 
                to="completed" 
                className={({isActive})=>isActive?"active":""} 
                onClick={() => setMenuOpen(false)}
              >
                Completed
              </NavLink>
              <NavLink 
                to="archived" 
                className={({isActive})=>isActive?"active":""} 
                onClick={() => setMenuOpen(false)}
              >
                Archived Orders
              </NavLink>
            </nav>
          </aside>
          <main className="min-h-[50vh] w-full" style={{ maxWidth: "none", width: "100%" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </AdminGate>
  );
}

