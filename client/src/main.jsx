// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App.jsx";

// your existing pages
import Home from "./pages/Home.jsx"; // adjust to your actual landing page
import SignIn from "./pages/SignIn.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Shop from "./pages/Shop.jsx";
import Products from "./pages/Products.jsx";
import Cart from "./pages/Cart.jsx";
import Favorites from "./pages/Favorites.jsx";
import Profile from "./pages/Profile.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import Orders from "./pages/Orders.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";
import SubCategories from "./pages/SubCategories.jsx";
// ✅ Add this line to load Tailwind
import "./styles/index.css";
// Generic CSS additions
import "./styles/generic.css";
// admin pages you added
import AdminLayout from "./pages/Admin/index.jsx";
import AdminUsers from "./pages/Admin/Users.jsx";
import AdminProducts from "./pages/Admin/Products.jsx";
import CreateProduct from "./pages/Admin/CreateProduct.jsx";
import AdminDashboard from "./pages/Admin/Dashboard.jsx";
import AdminOrders from "./pages/Admin/Orders.jsx";
import AdminSettings from "./pages/Admin/Settings.jsx";
import AdminCategories from "./pages/Admin/Categories.jsx";
import AdminHeroSlides from "./pages/Admin/HeroSlides.jsx";
import AdminAds from "./pages/Admin/Ads.jsx";
import AdminBrands from "./pages/Admin/Brands.jsx";
import EditProduct from "./pages/Admin/EditProduct.jsx";
import EditUser from "./pages/Admin/EditUser.jsx";
import EditCategory from "./pages/Admin/EditCategory.jsx";
import OrdersManagementLayout from "./pages/Admin/OrdersManagement/index.jsx";
import OrdersDashboard from "./pages/Admin/OrdersManagement/Dashboard.jsx";
import AdminOrderDetail from "./pages/Admin/OrdersManagement/OrderDetail.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import ContactUs from "./pages/ContactUs.jsx";
import ShippingReturns from "./pages/ShippingReturns.jsx";
import TermsConditions from "./pages/TermsConditions.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";

import "./lib/firebase"; // make sure Firebase init runs
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";
import { CurrencyProvider } from "./context/CurrencyContext.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,            // this is your layout with <Navbar/><Outlet/><Footer/>
    children: [
      { index: true, element: <Shop /> },
      { path: "home", element: <Home /> },
      { path: "signin", element: <SignIn /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "shop", element: <Shop /> },
      { path: "products", element: <Products /> },
      { path: "product/:id", element: <ProductDetail /> },
      { path: "subcategories/:categoryName", element: <SubCategories /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <OrderConfirmation /> },
      { path: "favorites", element: <Favorites /> },
      { path: "profile", element: <Profile /> },
      { path: "orders", element: <Orders /> },
      { path: "orders/:id", element: <OrderDetail /> },
      { path: "about", element: <AboutUs /> },
      { path: "contact", element: <ContactUs /> },
      { path: "shipping", element: <ShippingReturns /> },
      { path: "terms", element: <TermsConditions /> },
      { path: "privacy", element: <PrivacyPolicy /> },

      // ADMIN (nested under App layout)
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "orders-old", element: <AdminOrders /> }, // Keep old route for backward compatibility
          { path: "users", element: <AdminUsers /> },
          { path: "users/edit/:id", element: <EditUser /> },
          { path: "products", element: <AdminProducts /> },
          { path: "products/create", element: <CreateProduct /> },
          { path: "products/edit/:id", element: <EditProduct /> },
          { path: "categories", element: <AdminCategories /> },
          { path: "categories/edit/:id", element: <EditCategory /> },
          { path: "hero-slides", element: <AdminHeroSlides /> },
          { path: "ads", element: <AdminAds /> },
          { path: "brands", element: <AdminBrands /> },
          { path: "settings", element: <AdminSettings /> },
          // Orders Management with sidebar
          {
            path: "orders",
            element: <OrdersManagementLayout />,
            children: [
              { index: true, element: <OrdersDashboard /> },
              { path: "new", element: <OrdersDashboard /> },
              { path: "in-progress", element: <OrdersDashboard /> },
              { path: "ready", element: <OrdersDashboard /> },
              { path: "delivery", element: <OrdersDashboard /> },
              { path: "completed", element: <OrdersDashboard /> },
              { path: "archived", element: <OrdersDashboard /> },
              { path: ":id", element: <AdminOrderDetail /> },
            ],
          },
        ],
      },

      // catch-all
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CurrencyProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <RouterProvider router={router} />
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </CurrencyProvider>
  </React.StrictMode>
);
