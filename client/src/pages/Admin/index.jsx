import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminGate from "../../components/AdminGate.jsx";

export default function AdminLayout(){
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <AdminGate fallback={
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center mt-20 mb-20">
        <div className="text-center">
          <p className="text-lg text-gray-700">{t('admin.noAccess')}</p>
        </div>
      </div>
    }>
      <div className={`admin-container ${menuOpen ? 'menu-open' : ''}`}>
        {menuOpen && (
          <div
            className="admin-sidebar-overlay"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside className={`admin-sidebar sidebar card ${menuOpen ? 'open' : ''}`}>
          <nav className="flex flex-col gap-1">
            <NavLink to="." end className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.dashboard')}</NavLink>
            <NavLink to="orders" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.orders')}</NavLink>
            <NavLink to="products" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.products')}</NavLink>
            <NavLink to="categories" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.categories')}</NavLink>
            <NavLink to="hero-slides" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.heroSlides')}</NavLink>
            <NavLink to="ads" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.ads')}</NavLink>
            <NavLink to="brands" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.brands')}</NavLink>
            <NavLink to="users" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.users')}</NavLink>
            <NavLink to="contact-submissions" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.contactSubmissions')}</NavLink>
            <NavLink to="failed-orders" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.failedOrders')}</NavLink>
            <NavLink to="bulk-email" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.bulkEmail')}</NavLink>
            <NavLink to="coupons" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.coupons')}</NavLink>
            <NavLink to="reports" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.reports')}</NavLink>
            <NavLink to="settings" className={({isActive})=>isActive?"active":""} onClick={() => setMenuOpen(false)}>{t('admin.menu.settings')}</NavLink>
          </nav>
        </aside>
        <div className="admin-main-wrapper">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn btn-secondary btn-sm shrink-0"
              aria-label={t('admin.toggleMenu')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
          </div>
          <main className="admin-main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
