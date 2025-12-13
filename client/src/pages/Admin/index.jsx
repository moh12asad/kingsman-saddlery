import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import AdminGate from "../../components/AdminGate.jsx";

export default function AdminLayout(){
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <AdminGate fallback={
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center mt-20 mb-20">
        <div className="text-center">
          <p className="text-lg text-gray-700">You do not have access to admin.</p>
        </div>
      </div>
    }>
      <div className="container-page py-4 admin-container">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Admin</h1>
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
              <NavLink to="." end className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
              <NavLink to="orders" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Orders</NavLink>
              <NavLink to="products" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Products</NavLink>
              <NavLink to="categories" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Categories</NavLink>
              <NavLink to="hero-slides" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Hero Slides</NavLink>
              <NavLink to="ads" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Ad</NavLink>
              <NavLink to="brands" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Brands</NavLink>
              <NavLink to="users" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Users</NavLink>
              <NavLink to="settings" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>Settings</NavLink>
            </nav>
          </aside>
          <main className="min-h-[50vh] w-full overflow-x-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
