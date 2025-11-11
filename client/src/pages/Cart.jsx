import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <p className="text-gray-600 mb-4">Your cart is empty</p>
          <Link
            to="/shop"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:opacity-90 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const total = getTotalPrice();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-700 underline"
        >
          Clear Cart
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {cartItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg border shadow-sm p-3 flex items-center gap-3"
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                No image
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{item.name}</h3>
              {item.category && (
                <p className="text-xs text-gray-500">{item.category}</p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {item.sale ? (
                  <>
                    <span className="text-sm font-bold text-red-600">
                      ${item.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      ${item.originalPrice.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-gray-900">
                    ${item.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="px-2 py-1 text-sm hover:bg-gray-100 transition"
                >
                  -
                </button>
                <span className="px-2 py-1 min-w-[2rem] text-center text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="px-2 py-1 text-sm hover:bg-gray-100 transition"
                >
                  +
                </button>
              </div>
              <div className="text-right min-w-[4rem]">
                <p className="font-bold text-sm">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-red-600 hover:text-red-700 px-2 py-1 text-lg leading-none"
                title="Remove item"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-xl font-bold text-indigo-600">
            ${total.toFixed(2)}
          </span>
        </div>
        <div className="flex gap-3">
          <Link
            to="/shop"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center text-sm hover:bg-gray-50 transition"
          >
            Continue Shopping
          </Link>
          <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:opacity-90 transition">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </main>
  );
}

