import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { FaShoppingCart } from "react-icons/fa";

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart, isLoaded } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // Show loading state while cart is being loaded from localStorage
  if (!isLoaded) {
    return (
      <main className="cart-page">
        <div className="cart-container">
          <div 
            className="flex-row flex-gap-md margin-bottom-lg" 
            style={{ 
              alignItems: 'center',
              justifyContent: currentLanguage === 'ar' || currentLanguage === 'he' ? 'flex-end' : 'flex-start',
              flexDirection: currentLanguage === 'ar' || currentLanguage === 'he' ? 'row-reverse' : 'row'
            }}
          >
            <FaShoppingCart style={{ fontSize: '1.5rem', color: 'var(--brand)' }} />
            <h1 className="heading-1">{t("cart.title")}</h1>
            {cartItems.length > 0 && (
              <span className="text-muted">({cartItems.length} {t("cart.items")})</span>
            )}
          </div>
          <div className="text-center padding-y-lg">
            <div className="loading-spinner mx-auto"></div>
            <p className="margin-top-md text-muted">{t("cart.loading")}</p>
          </div>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-container">
          <div 
            className="flex-row flex-gap-md margin-bottom-lg" 
            style={{ 
              alignItems: 'center',
              justifyContent: currentLanguage === 'ar' || currentLanguage === 'he' ? 'flex-end' : 'flex-start',
              flexDirection: currentLanguage === 'ar' || currentLanguage === 'he' ? 'row-reverse' : 'row'
            }}
          >
            <FaShoppingCart style={{ fontSize: '1.5rem', color: 'var(--brand)' }} />
            <h1 className="heading-1">{t("cart.title")}</h1>
          </div>
          <div className="card-empty">
            <p className="text-muted margin-bottom-md">{t("cart.empty")}</p>
            <Link
              to="/shop"
              className="btn-primary"
            >
              {t("cart.continueShopping")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const total = getTotalPrice();

  function handleCheckout() {
    if (!user) {
      // Redirect to sign-in with return URL
      navigate("/signin?redirect=/cart");
      return;
    }
    // Navigate to order confirmation page
    navigate("/checkout");
  }

  return (
      <main className="cart-page">
        <div className="cart-container">
          <div 
            className="flex-row flex-gap-md margin-bottom-lg" 
            style={{ 
              alignItems: 'center',
              justifyContent: currentLanguage === 'ar' || currentLanguage === 'he' ? 'flex-end' : 'flex-start',
              flexDirection: currentLanguage === 'ar' || currentLanguage === 'he' ? 'row-reverse' : 'row'
            }}
          >
            <FaShoppingCart style={{ fontSize: '1.5rem', color: 'var(--brand)' }} />
            <h1 className="heading-1">{t("cart.title")}</h1>
            {cartItems.length > 0 && (
              <span className="text-muted">({cartItems.length} {t("cart.items")})</span>
            )}
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="cart-clear-btn"
                style={{ marginLeft: 'auto' }}
              >
                {t("cart.clearCart")}
              </button>
            )}
          </div>

        <div className="cart-items">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="card-cart-item"
            >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="img-cart"
              />
            ) : (
              <div className="img-placeholder" style={{ width: '4rem', height: '4rem' }}>
                {t("cart.noImage")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-small text-truncate">{item.name}</h3>
              {item.category && (
                <p className="text-xs text-muted">{item.category}</p>
              )}
              <div className="flex-row flex-gap-sm margin-top-sm">
                {item.sale ? (
                  <>
                    <span className="price-sale text-small">
                      {formatPrice(item.price)}
                    </span>
                    <span className="price-original text-xs">
                      {formatPrice(item.originalPrice)}
                    </span>
                  </>
                ) : (
                  <span className="price text-small">
                    {formatPrice(item.price)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-row flex-gap-sm">
              <div className="quantity-controls">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="quantity-button"
                >
                  -
                </button>
                <span className="quantity-display">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="quantity-button"
                >
                  +
                </button>
              </div>
              <div className="text-right" style={{ minWidth: '4rem' }}>
                <p className="font-bold text-small">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-error padding-x-sm padding-y-sm text-lg transition"
                style={{ lineHeight: 1 }}
                title={t("cart.removeItem")}
              >
                ×
              </button>
            </div>
          </div>
          ))}
        </div>

        {!user && (
          <div className="card padding-md margin-bottom-lg" style={{ background: "#fef3c7", borderColor: "#f59e0b" }}>
            <div className="flex-row flex-gap-sm margin-bottom-sm">
              <strong style={{ color: "#92400e" }}>{t("cart.signInRequired")}</strong>
              <span style={{ color: "#92400e" }}>{t("cart.signInRequiredMessage")}</span>
            </div>
            <Link
              to="/signin?redirect=/cart"
              className="btn-primary"
            >
              {t("cart.signInToCheckout")}
            </Link>
          </div>
        )}

        <div className="cart-summary">
          <div className="cart-total">
            <span className="cart-total-label">{t("cart.total")}</span>
            <span className="cart-total-amount">
              {formatPrice(total)}
            </span>
          </div>
          <div className="cart-actions">
            <Link
              to="/shop"
              className="btn-secondary btn-full"
            >
              {t("cart.continueShopping")}
            </Link>
            <button 
              className="btn-primary btn-full"
              onClick={handleCheckout}
              disabled={!user}
            >
              {t("cart.proceedToCheckout")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

