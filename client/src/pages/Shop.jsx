import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmProduct, setConfirmProduct] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/products`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch products");
        }

        // Filter only available products
        const availableProducts = (data.products || []).filter(
          (product) => product.available === true
        );

        // Sort: products with sale first, then by name
        const sortedProducts = availableProducts.sort((a, b) => {
          // If both have sale or both don't, sort by name
          if (a.sale === b.sale) {
            return (a.name || "").localeCompare(b.name || "");
          }
          // Products with sale come first
          return a.sale ? -1 : 1;
        });

        setProducts(sortedProducts);
      } catch (err) {
        setError(err.message || "Failed to load products");
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const handleAddToCart = (product) => {
    setConfirmProduct(product);
  };

  const confirmAddToCart = () => {
    if (confirmProduct) {
      addToCart(confirmProduct);
      setConfirmProduct(null);
    }
  };

  const cancelAddToCart = () => {
    setConfirmProduct(null);
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading products...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Shop</h1>
      
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No available products at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  No image
                </div>
              )}
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                  {product.sale && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-1">
                      SALE
                    </span>
                  )}
                </div>
                {product.category && (
                  <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {product.sale && product.sale_proce > 0 ? (
                    <>
                      <span className="text-base font-bold text-red-600">
                        ${product.sale_proce.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 line-through">
                        ${product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-base font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="mt-auto w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:opacity-90 transition"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmProduct && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={cancelAddToCart}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Add to Cart?</h2>
            <div className="flex items-center gap-4 mb-6">
              {confirmProduct.image ? (
                <img
                  src={confirmProduct.image}
                  alt={confirmProduct.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                  No image
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{confirmProduct.name}</h3>
                {confirmProduct.category && (
                  <p className="text-sm text-gray-500">{confirmProduct.category}</p>
                )}
                <div className="mt-1">
                  {confirmProduct.sale && confirmProduct.sale_proce > 0 ? (
                    <>
                      <span className="text-lg font-bold text-red-600">
                        ${confirmProduct.sale_proce.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-400 line-through ml-2">
                        ${confirmProduct.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      ${confirmProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelAddToCart}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddToCart}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:opacity-90 transition"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

