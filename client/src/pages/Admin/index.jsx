import { NavLink, Outlet } from "react-router-dom";
import AdminGate from "../../components/AdminGate.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

export default function AdminLayout(){
  const { t } = useLanguage();
  
  return (
    <AdminGate fallback={<div className="p-6">{t("admin.noAccess")}</div>}>
      <div className="container-page py-4">
        <h1 className="text-2xl font-bold mb-4">{t("common.admin")}</h1>
        <div className="admin-shell items-start">
          <aside className="sidebar card">
            <nav className="flex flex-col gap-1">
              <NavLink to="." end className={({isActive})=>isActive?"active":""}>{t("admin.dashboard")}</NavLink>
              <NavLink to="orders" className={({isActive})=>isActive?"active":""}>{t("admin.orders")}</NavLink>
              <NavLink to="products" className={({isActive})=>isActive?"active":""}>{t("admin.products")}</NavLink>
              <NavLink to="categories" className={({isActive})=>isActive?"active":""}>{t("admin.categories")}</NavLink>
              <NavLink to="hero-slides" className={({isActive})=>isActive?"active":""}>{t("admin.heroSlides")}</NavLink>
              <NavLink to="ads" className={({isActive})=>isActive?"active":""}>{t("admin.ads")}</NavLink>
              <NavLink to="brands" className={({isActive})=>isActive?"active":""}>{t("admin.brands")}</NavLink>
              <NavLink to="users" className={({isActive})=>isActive?"active":""}>{t("admin.users")}</NavLink>
              <NavLink to="settings" className={({isActive})=>isActive?"active":""}>{t("admin.settings")}</NavLink>
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
