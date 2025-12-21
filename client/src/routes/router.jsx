import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import Admin from "../pages/Admin";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "../components/ProtectedRoute";
import App from "../App.jsx";
import CreateOwner from "../pages/CreateOwner.jsx";
import Owner from "../pages/Owner.jsx";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import SignIn from "../pages/SignIn.jsx";
import SignUp from "../pages/SignUp.jsx";
import GuestRoute from "../components/GuestRoute.jsx";
import OwnerView from "../pages/OwnerView.jsx";
import OwnerRoute from "../components/OwnerRoute.jsx";
import Shop from "../pages/Shop.jsx";
import Cart from "../pages/Cart.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: "shop", element: <Shop /> },
      { path: "cart", element: <Cart /> },
      { path: "signin", element: <SignIn /> },
      { path: "signup", element: (
        <GuestRoute>
          <SignUp />
        </GuestRoute>
      ) },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "admin", element: (
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      ) },

      { path: "signin", element: (
         <GuestRoute>
             <SignIn />
          </GuestRoute>
        ) },
        { path: "owner", element: (
          <OwnerRoute>
              <OwnerView />
          </OwnerRoute>
            ),
            // Optional nested routes keep everything under /owner/*
            // children: [
            //   { index: true, element: <OwnerView /> },
            //   { path: "edit", element: <OwnerEdit /> },
            //   { path: "bookings", element: <OwnerBookings /> },
            //   { path: "invoices", element: <OwnerInvoices /> },
            //   { path: "notes", element: <OwnerNotes /> },
            //   { path: "support", element: <OwnerSupport /> },
            // ],
        },
        {
            path: "owner/:id",
            element: (
                <OwnerRoute>
                    <OwnerView />
                </OwnerRoute>
            ),
        },
    ]
  }
]);
