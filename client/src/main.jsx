// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App.jsx";

// your existing pages
import Home from "./pages/Home.jsx"; // adjust to your actual landing page

// admin pages you added
import AdminLayout from "./pages/Admin/index.jsx";
import AdminUsers from "./pages/Admin/Users.jsx";
import AdminProducts from "./pages/Admin/Products.jsx";

import "./lib/firebase"; // make sure Firebase init runs

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,            // this is your layout with <Navbar/><Outlet/><Footer/>
    children: [
      { index: true, element: <Home /> },

      // ADMIN (nested under App layout)
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: "users", element: <AdminUsers /> },
          { path: "products", element: <AdminProducts /> },
        ],
      },

      // catch-all
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
