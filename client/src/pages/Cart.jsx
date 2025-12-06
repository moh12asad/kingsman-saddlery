import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart, isLoaded } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  // Show loading state while cart is being loaded from localStorage
  if (!isLoaded) {
    return (
      <main className="cart-page">
        <div className="cart-container">
          <h1 className="cart-title">Your Cart</h1>
          <div className="text-center padding-y-lg">
            <div className="loading-spinner mx-auto"></div>
            <p className="margin-top-md text-muted">Loading cart...</p>
          </div>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-container">
          <h1 className="cart-title">Your Cart</h1>
          <div className="card-empty">
            <p className="text-muted margin-bottom-md">Your cart is empty</p>
            <Link
              to="/shop"
              className="btn-primary"
            >
              Continue Shopping
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
        <div className="cart-header">
          <h1 className="cart-title">Your Cart</h1>
          <button
            onClick={clearCart}
            className="cart-clear-btn"
          >
            Clear Cart
          </button>
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
                No image
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
                title="Remove item"
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
              <strong style={{ color: "#92400e" }}>Sign in required:</strong>
              <span style={{ color: "#92400e" }}>Please sign in to proceed to checkout.</span>
            </div>
            <Link
              to="/signin?redirect=/cart"
              className="btn-primary"
            >
              Sign in to Checkout
            </Link>
          </div>
        )}

        <div className="cart-summary">
          <div className="cart-total">
            <span className="cart-total-label">Total:</span>
            <span className="cart-total-amount">
              {formatPrice(total)}
            </span>
          </div>
          <div className="cart-actions">
            <Link
              to="/shop"
              className="btn-secondary btn-full"
            >
              Continue Shopping
            </Link>
            <button 
              className="btn-primary btn-full"
              onClick={handleCheckout}
              disabled={!user}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

