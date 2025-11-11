import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <main className="container-narrow padding-y-lg">
        <h1 className="heading-2 margin-bottom-lg">Your Cart</h1>
        <div className="card-empty">
          <p className="text-muted margin-bottom-md">Your cart is empty</p>
          <Link
            to="/shop"
            className="btn-link"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const total = getTotalPrice();

  return (
    <main className="container-narrow padding-y-lg">
      <div className="flex-row-between margin-bottom-lg">
        <h1 className="heading-2">Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-xs text-error underline transition"
        >
          Clear Cart
        </button>
      </div>

      <div className="spacing-y-sm margin-bottom-lg">
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
                      ${item.price.toFixed(2)}
                    </span>
                    <span className="price-original text-xs">
                      ${item.originalPrice.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="price text-small">
                    ${item.price.toFixed(2)}
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
                  ${(item.price * item.quantity).toFixed(2)}
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

      <div className="card padding-md">
        <div className="flex-row-between margin-bottom-md">
          <span className="heading-3 font-semibold">Total:</span>
          <span className="price-total">
            ${total.toFixed(2)}
          </span>
        </div>
        <div className="flex-row flex-gap-md">
          <Link
            to="/shop"
            className="btn-secondary btn-full text-small transition"
          >
            Continue Shopping
          </Link>
          <button className="btn-primary btn-full text-small transition">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </main>
  );
}

