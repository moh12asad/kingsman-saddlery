import { useAuth } from "../context/AuthContext";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { signInWithGoogle, signOutUser } from "../lib/firebase";
import { FaShoppingCart, FaCog, FaHeart, FaUser, FaSearch, FaShoppingBag, FaChevronDown, FaPhone } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { getStoreInfo } from "../utils/storeInfo";
import "../styles/language-switcher.css";

export default function Navbar() {
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const { getFavoriteCount } = useFavorites();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cartCount = getTotalItems();
  const favoriteCount = getFavoriteCount();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  const handleSearchClick = () => {
    navigate("/products?search=true");
  };

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    return adminEmails.length === 0 || adminEmails.includes(user.email.toLowerCase());
  }, [user]);

  // Load store info
  useEffect(() => {
    async function loadStoreInfo() {
      try {
        const storeData = await getStoreInfo();
        setStoreInfo(storeData);
      } catch (err) {
        console.error("Failed to load store info:", err);
      }
    }
    loadStoreInfo();
  }, []);

  // Check if mobile and calculate dropdown position
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate dropdown position on mobile
  useEffect(() => {
    if (showProfileMenu && isMobile && profileButtonRef.current) {
      const updatePosition = () => {
        const buttonRect = profileButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setDropdownPosition({
            top: buttonRect.bottom + 8,
            right: window.innerWidth - buttonRect.right
          });
        }
      };

      updatePosition();
      
      // Listen to scroll on window, document, and all scrollable containers
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      document.addEventListener('scroll', updatePosition, true);
      document.documentElement.addEventListener('scroll', updatePosition, true);
      document.body.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        document.removeEventListener('scroll', updatePosition, true);
        document.documentElement.removeEventListener('scroll', updatePosition, true);
        document.body.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [showProfileMenu, isMobile]);

  // Close dropdown when clicking outside (only for desktop)
  useEffect(() => {
    if (isMobile) return; // Don't add click outside handler for mobile (backdrop handles it)
    
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      // Small delay to prevent immediate closure
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 10);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showProfileMenu, isMobile]);

  return (
    <header className="navbar">
      <nav className="navbar-content">
        <div className="navbar-left">
          {/* Phone Number */}
          {storeInfo?.storePhone && (
            <a href={`tel:${storeInfo.storePhone}`} className="navbar-phone">
              <FaPhone className="navbar-phone-icon" />
              <span className="navbar-phone-text">{storeInfo.storePhone}</span>
            </a>
          )}
          
          {/* Navigation Links */}
          <div className="navbar-nav-links">
            <NavLink 
              to="/" 
              className={({ isActive }) => `navbar-nav-link ${isActive ? "navbar-nav-link-active" : ""}`}
            >
              {t("navbar.home")}
            </NavLink>
            <NavLink 
              to="/about" 
              className={({ isActive }) => `navbar-nav-link ${isActive ? "navbar-nav-link-active" : ""}`}
            >
              {t("footer.links.aboutUs")}
            </NavLink>
            <NavLink 
              to="/contact" 
              className={({ isActive }) => `navbar-nav-link ${isActive ? "navbar-nav-link-active" : ""}`}
            >
              {t("footer.links.contactUs")}
            </NavLink>
            <NavLink 
              to="/shipping" 
              className={({ isActive }) => `navbar-nav-link ${isActive ? "navbar-nav-link-active" : ""}`}
            >
              {t("navbar.directions")}
            </NavLink>
          </div>
        </div>
        <Link to="/" className="navbar-brand-center">
          <div className="navbar-brand-wrapper">
            <h1 className="navbar-brand-title">KingsmanSaddlery</h1>
            <p className="navbar-brand-subtitle">Saddles & Tack</p>
          </div>
        </Link>
        <div className="navbar-links">
          <LanguageSwitcher />
          <button
            onClick={handleSearchClick}
            className="nav-link relative flex-row-center"
            title={t("navbar.search")}
          >
            <FaSearch className="w-5 h-5" />
          </button>
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
                    {t("navbar.signIn")}
                </NavLink>
            ) : (
                <div className="flex-row flex-gap-md profile-menu-container" ref={profileMenuRef}>
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            className="img-avatar"
                            alt="avatar"
                            style={{ cursor: "pointer" }}
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        />
                    )}
                    <button
                        ref={profileButtonRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowProfileMenu(!showProfileMenu);
                        }}
                        className={`flex-row flex-gap-sm nav-link ${showProfileMenu ? "nav-link-active" : ""}`}
                        title="Profile"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                        <FaUser className="w-4 h-4" />
                        <span className="text-small sm:inline hidden">{user.displayName || user.email}</span>
                        <FaChevronDown className="w-3 h-3" style={{ transition: "transform 0.2s", transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>
                    
                    {showProfileMenu && !isMobile && (
                        <div 
                            className="profile-dropdown"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <NavLink
                                to="/profile"
                                className="profile-dropdown-item"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                <FaUser className="w-4 h-4" />
                                <span>{t("navbar.profile")}</span>
                            </NavLink>
                            <NavLink
                                to="/orders"
                                className="profile-dropdown-item"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                <FaShoppingBag className="w-4 h-4" />
                                <span>{t("navbar.orders")}</span>
                            </NavLink>
                            <div className="profile-dropdown-divider"></div>
                            <button
                                onClick={async () => {
                                    setShowProfileMenu(false);
                                    await signOutUser();
                                    navigate("/");
                                }}
                                className="profile-dropdown-item"
                                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                            >
                                {t("navbar.signOut")}
                            </button>
                        </div>
                    )}
                    {showProfileMenu && isMobile && createPortal(
                        <>
                            {/* Backdrop to close dropdown */}
                            <div 
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 1010,
                                    backgroundColor: 'transparent'
                                }}
                                onClick={() => setShowProfileMenu(false)}
                            />
                            {/* Dropdown menu */}
                            <div 
                                className="profile-dropdown profile-dropdown-mobile"
                                onClick={(e) => {
                                    // Allow clicks on links/buttons to work
                                    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button')) {
                                        return;
                                    }
                                    e.stopPropagation();
                                }}
                                style={{
                                    position: 'fixed',
                                    top: `${dropdownPosition.top}px`,
                                    right: `${dropdownPosition.right}px`,
                                    zIndex: 1011
                                }}
                            >
                                <NavLink
                                    to="/profile"
                                    className="profile-dropdown-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowProfileMenu(false);
                                    }}
                                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                >
                                    <FaUser className="w-4 h-4" />
                                    <span>{t("navbar.profile")}</span>
                                </NavLink>
                                <NavLink
                                    to="/orders"
                                    className="profile-dropdown-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowProfileMenu(false);
                                    }}
                                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                >
                                    <FaShoppingBag className="w-4 h-4" />
                                    <span>{t("navbar.orders")}</span>
                                </NavLink>
                                <div className="profile-dropdown-divider"></div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowProfileMenu(false);
                                        signOutUser().then(() => {
                                            navigate("/");
                                        });
                                    }}
                                    className="profile-dropdown-item"
                                    style={{ 
                                        width: "100%", 
                                        textAlign: "left", 
                                        background: "none", 
                                        border: "none", 
                                        cursor: "pointer",
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    {t("navbar.signOut")}
                                </button>
                            </div>
                        </>,
                        document.body
                    )}
                </div>
            )}
        </div>
      </nav>
    </header>
  );
}
