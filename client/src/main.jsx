// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App.jsx";

// your existing pages
import Home from "./pages/Home.jsx"; // adjust to your actual landing page
import SignIn from "./pages/SignIn.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
// ✅ Add this line to load Tailwind
import "./styles/index.css";
// Generic CSS additions
import "./styles/generic.css";
// admin pages you added
import AdminLayout from "./pages/Admin/index.jsx";
import AdminUsers from "./pages/Admin/Users.jsx";
import AdminProducts from "./pages/Admin/Products.jsx";
import AdminDashboard from "./pages/Admin/Dashboard.jsx";
import AdminOrders from "./pages/Admin/Orders.jsx";
import AdminSettings from "./pages/Admin/Settings.jsx";

import "./lib/firebase"; // make sure Firebase init runs
import { AuthProvider } from "./context/AuthContext.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,            // this is your layout with <Navbar/><Outlet/><Footer/>
    children: [
      { index: true, element: <Home /> },
      { path: "signin", element: <SignIn /> },
      { path: "forgot-password", element: <ForgotPassword /> },

      // ADMIN (nested under App layout)
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "orders", element: <AdminOrders /> },
          { path: "users", element: <AdminUsers /> },
          { path: "products", element: <AdminProducts /> },
          { path: "settings", element: <AdminSettings /> },
        ],
      },

      // catch-all
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
