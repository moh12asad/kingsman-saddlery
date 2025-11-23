import { useAuth } from "../context/AuthContext";
import { Link, NavLink } from "react-router-dom";
import { signInWithGoogle, signOutUser } from "../lib/firebase";
import { FaShoppingCart, FaCog, FaHeart, FaUser } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useMemo } from "react";

export default function Navbar() {
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const { getFavoriteCount } = useFavorites();
  const cartCount = getTotalItems();
  const favoriteCount = getFavoriteCount();

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    return adminEmails.length === 0 || adminEmails.includes(user.email.toLowerCase());
  }, [user]);

  return (
    <header className="navbar">
      <nav className="navbar-content">
        <Link to="/" className="font-bold text-xl tracking-tight" style={{ flexShrink: 0, marginRight: 'auto' }}>
          <span className="text-indigo-600">Kingsman</span>Saddlery
        </Link>
        <div className="navbar-links" style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <NavLink to="/shop" className={({ isActive }) => isActive ? "nav-link-active" : "nav-link"}>
            Shop
          </NavLink>
          <NavLink 
            to="/favorites" 
            className={({ isActive }) => `relative flex-row-center ${isActive ? "nav-link-active" : "nav-link"}`}
            title="Favorites"
          >
            <FaHeart className="w-5 h-5" />
            {favoriteCount > 0 && (
              <span className="badge-count">
                {favoriteCount > 9 ? '9+' : favoriteCount}
              </span>
            )}
          </NavLink>
          <NavLink 
            to="/cart" 
            className={({ isActive }) => `relative flex-row-center ${isActive ? "nav-link-active" : "nav-link"}`}
          >
            <FaShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="badge-count">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `btn-icon padding-x-md padding-y-sm rounded-lg transition ${
                isActive 
                  ? "btn-primary" 
                  : "btn-secondary"
              }`}
              title="Admin Panel"
            >
              <FaCog className="w-4 h-4" />
              <span className="text-small font-medium sm:inline hidden">Admin</span>
            </NavLink>
          )}
            {!user ? (
                <NavLink
                    to="/signin"
                    className="btn-link"
                >
                    Sign in
                </NavLink>
            ) : (
                <div className="flex-row flex-gap-md">
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            className="img-avatar"
                            alt="avatar"
                        />
                    )}
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => `flex-row flex-gap-sm ${isActive ? "nav-link-active" : "nav-link"}`}
                        title="Profile"
                    >
                        <FaUser className="w-4 h-4" />
                        <span className="text-small sm:inline hidden">{user.displayName || user.email}</span>
                    </NavLink>
                    <button
                        onClick={signOutUser}
                        className="btn-secondary padding-x-md padding-y-sm"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
      </nav>
    </header>
  );
}
