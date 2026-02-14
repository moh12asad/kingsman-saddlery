import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ReportsLayout() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.reports.title')}</h1>
      </div>
      
      <div className="card">
        <div className="section-title margin-bottom-md">{t('admin.reports.selectReport')}</div>
        <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <NavLink 
            to="sales-overview" 
            className="card hover:shadow-lg transition-shadow p-4 border-2 border-transparent hover:border-blue-500"
          >
            <div className="font-semibold text-lg mb-2">{t('admin.reports.salesOverview')}</div>
            <div className="text-sm text-gray-600">{t('admin.reports.salesOverviewDesc')}</div>
          </NavLink>
          
          <NavLink 
            to="best-sellers" 
            className="card hover:shadow-lg transition-shadow p-4 border-2 border-transparent hover:border-blue-500"
          >
            <div className="font-semibold text-lg mb-2">{t('admin.reports.bestSellers')}</div>
            <div className="text-sm text-gray-600">{t('admin.reports.bestSellersDesc')}</div>
          </NavLink>
          
          <NavLink 
            to="revenue-by-period" 
            className="card hover:shadow-lg transition-shadow p-4 border-2 border-transparent hover:border-blue-500"
          >
            <div className="font-semibold text-lg mb-2">{t('admin.reports.revenueByPeriod')}</div>
            <div className="text-sm text-gray-600">{t('admin.reports.revenueByPeriodDesc')}</div>
          </NavLink>
          
          <NavLink 
            to="order-status" 
            className="card hover:shadow-lg transition-shadow p-4 border-2 border-transparent hover:border-blue-500"
          >
            <div className="font-semibold text-lg mb-2">{t('admin.reports.orderStatus')}</div>
            <div className="text-sm text-gray-600">{t('admin.reports.orderStatusDesc')}</div>
          </NavLink>
          
          <NavLink 
            to="products-by-category" 
            className="card hover:shadow-lg transition-shadow p-4 border-2 border-transparent hover:border-blue-500"
          >
            <div className="font-semibold text-lg mb-2">{t('admin.reports.productsByCategory')}</div>
            <div className="text-sm text-gray-600">{t('admin.reports.productsByCategoryDesc')}</div>
          </NavLink>
          
          <NavLink 
            to="payment-method" 
            className="card hover:shadow-lg transition-shadow p-4 border-2 border-transparent hover:border-blue-500"
          >
            <div className="font-semibold text-lg mb-2">{t('admin.reports.paymentMethod')}</div>
            <div className="text-sm text-gray-600">{t('admin.reports.paymentMethodDesc')}</div>
          </NavLink>
          
          <NavLink 
            to="geographic-sales" 
            className="card hover:shadow-lg transition-shadow p-4 border-2 border-transparent hover:border-blue-500"
          >
            <div className="font-semibold text-lg mb-2">{t('admin.reports.geographicSales')}</div>
            <div className="text-sm text-gray-600">{t('admin.reports.geographicSalesDesc')}</div>
          </NavLink>
        </nav>
      </div>
      
      <Outlet />
    </div>
  );
}

