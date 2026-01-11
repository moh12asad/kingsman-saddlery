import { useState, useRef, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { getTranslated } from "../utils/translations";
import { Link, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaTimes, FaTrash } from "react-icons/fa";
import { createPortal } from "react-dom";
import "../styles/cart-dropdown.css";

export default function CartDropdown({ isOpen, onClose, buttonRef }) {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart, isLoaded } = useCart();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const total = getTotalPrice();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const updatePosition = () => {
        const buttonRect = buttonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          if (isMobile) {
            // On mobile, position below navbar and center horizontally
            const navbar = document.querySelector('.navbar');
            const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 60;
            setDropdownPosition({
              top: navbarHeight + 8,
              right: 0 // Will be overridden by CSS to center
            });
          } else {
            // On desktop, align to the right of the button
            setDropdownPosition({
              top: buttonRect.bottom + 8,
              right: window.innerWidth - buttonRect.right
            });
          }
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, buttonRef, isMobile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target)
      ) {
        onClose();
      }
    }

    // Small delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  const handleCheckout = () => {
    onClose();
    if (!user) {
      navigate("/signin?redirect=/checkout");
      return;
    }
    navigate("/checkout");
  };

  const handleItemClick = (productId) => {
    onClose();
    navigate(`/product/${productId}`);
  };

  if (!isLoaded) {
    return null;
  }

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={`cart-dropdown ${isMobile ? 'cart-dropdown-mobile' : ''}`}
      style={isMobile ? {
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        right: 'auto',
        zIndex: 1011
      } : {}}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cart-dropdown-header">
        <h3 className="cart-dropdown-title">
          {t("cart.title")} ({cartCount} {cartCount === 1 ? t("cart.item") : t("cart.items")})
        </h3>
        <button
          onClick={onClose}
          className="cart-dropdown-close"
          aria-label="Close cart"
        >
          <FaTimes />
        </button>
      </div>

      {cartItems.length === 0 ? (
        <div className="cart-dropdown-empty">
          <FaShoppingCart className="cart-dropdown-empty-icon" />
          <p className="cart-dropdown-empty-text">{t("cart.empty")}</p>
          <Link
            to="/shop"
            className="btn-primary btn-sm"
            onClick={onClose}
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-dropdown-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-dropdown-item">
                <div
                  className="cart-dropdown-item-image"
                  onClick={() => handleItemClick(item.id)}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={getTranslated(item.name, i18n.language || 'en')}
                    />
                  ) : (
                    <div className="cart-dropdown-item-placeholder">
                      {t("cart.noImage")}
                    </div>
                  )}
                </div>
                <div className="cart-dropdown-item-details">
                  <h4
                    className="cart-dropdown-item-name"
                    onClick={() => handleItemClick(item.id)}
                  >
                    {getTranslated(item.name, i18n.language || 'en')}
                  </h4>
                  <div className="cart-dropdown-item-price-row">
                    <div className="cart-dropdown-item-price">
                      {item.sale ? (
                        <>
                          <span className="price-sale">
                            {formatPrice(item.price)}
                          </span>
                          <span className="price-original">
                            {formatPrice(item.originalPrice)}
                          </span>
                        </>
                      ) : (
                        <span className="price">
                          {formatPrice(item.price)}
                        </span>
                      )}
                    </div>
                    <div className="cart-dropdown-item-quantity">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="quantity-button quantity-button-sm"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="quantity-display quantity-display-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="quantity-button quantity-button-sm"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="cart-dropdown-item-total">
                    {t("cart.subtotal")}: <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="cart-dropdown-item-remove"
                  aria-label={t("cart.removeItem")}
                  title={t("cart.removeItem")}
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-dropdown-footer">
            <div className="cart-dropdown-total">
              <span className="cart-dropdown-total-label">{t("cart.total")}:</span>
              <span className="cart-dropdown-total-amount">{formatPrice(total)}</span>
            </div>
            {!user && (
              <div className="cart-dropdown-signin-notice">
                <p>{t("cart.signInRequiredMessage")}</p>
              </div>
            )}
            <div className="cart-dropdown-actions">
              <Link
                to="/shop"
                className="btn-secondary btn-sm"
                onClick={onClose}
              >
                {t("cart.continueShopping")}
              </Link>
              <button
                className="btn-primary btn-sm"
                onClick={handleCheckout}
              >
                {t("cart.proceedToCheckout")}
              </button>
            </div>
            {cartItems.length > 0 && (
              <button
                onClick={() => {
                  const confirmMessage = t("cart.clearCartConfirm") || "Are you sure you want to clear your cart?";
                  if (window.confirm(confirmMessage)) {
                    clearCart();
                  }
                }}
                className="cart-dropdown-clear"
              >
                {t("cart.clearCart")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return isOpen ? createPortal(
      <>
        {/* Backdrop */}
        <div
          className="cart-dropdown-backdrop"
          onClick={onClose}
        />
        {dropdownContent}
      </>,
      document.body
    ) : null;
  }

  return isOpen ? dropdownContent : null;
}

