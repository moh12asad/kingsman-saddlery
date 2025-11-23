import { useEffect, useState } from "react";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import { FaHeart, FaShoppingCart } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Favorites() {
  const { favorites, removeFavorite, isLoaded: favoritesLoaded } = useFavorites();
  const { addToCart } = useCart();
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/products`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch products");
        }

        setProducts(data.products || []);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Get full product details for favorites
  const favoriteProducts = favorites.map(fav => {
    const fullProduct = products.find(p => p.id === fav.id);
    return fullProduct || fav;
  }).filter(Boolean);

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

  // Show loading state while favorites or products are being loaded
  if (!favoritesLoaded || loading) {
    return (
      <main className="min-h-screen bg-gray-50 loading-container">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="margin-top-md text-muted">Loading favorites...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 page-with-navbar">
      <div className="container-main padding-y-xl">
        <div className="flex-row flex-gap-md margin-bottom-lg" style={{ alignItems: 'center' }}>
          <FaHeart className="text-red-500" style={{ fontSize: '1.5rem' }} />
          <h1 className="heading-1">My Favorites</h1>
          {favoriteProducts.length > 0 && (
            <span className="text-muted">({favoriteProducts.length} items)</span>
          )}
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="card-empty">
            <FaHeart className="text-muted" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <h2 className="heading-3 margin-bottom-sm">No favorites yet</h2>
            <p className="text-muted margin-bottom-md">
              Start adding products to your favorites by clicking the heart icon on any product.
            </p>
            <a href="/shop" className="btn-primary">
              Browse Products
            </a>
          </div>
        ) : (
          <div className="grid-products">
            {favoriteProducts.map((product) => (
              <div key={product.id} className="card-product">
                <div className="relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="img-product"
                    />
                  ) : (
                    <div className="img-placeholder">No image</div>
                  )}
                  <button
                    className="card-product-favorite active"
                    onClick={() => removeFavorite(product.id)}
                    aria-label="Remove from favorites"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
                  >
                    <FaHeart />
                  </button>
                  {product.sale && (
                    <span className="badge-sale absolute" style={{ top: '0.5rem', left: '0.5rem' }}>
                      SALE
                    </span>
                  )}
                </div>
                <div className="padding-sm flex-col flex-1">
                  <h3 className="font-semibold text-small text-truncate-2 margin-bottom-sm">
                    {product.name}
                  </h3>
                  {product.category && (
                    <p className="text-xs text-muted margin-bottom-sm">{product.category}</p>
                  )}
                  <div className="flex-row flex-gap-sm margin-bottom-md">
                    {product.sale && product.sale_proce > 0 ? (
                      <>
                        <span className="price-sale">
                          ${product.sale_proce.toFixed(2)}
                        </span>
                        <span className="price-original">
                          ${product.price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="price">
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition"
                  >
                    <FaShoppingCart style={{ marginRight: '0.5rem' }} />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmProduct && (
        <div 
          className="modal-overlay"
          onClick={cancelAddToCart}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="heading-3 margin-bottom-md">Add to Cart?</h2>
            <div className="flex-row flex-gap-md margin-bottom-lg">
              {confirmProduct.image ? (
                <img
                  src={confirmProduct.image}
                  alt={confirmProduct.name}
                  className="img-cart"
                />
              ) : (
                <div className="img-placeholder">
                  No image
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold heading-3">{confirmProduct.name}</h3>
                {confirmProduct.category && (
                  <p className="text-small text-muted">{confirmProduct.category}</p>
                )}
                {confirmProduct.description && (
                  <p className="text-small text-muted margin-top-sm">{confirmProduct.description}</p>
                )}
                <div className="margin-top-sm">
                  {confirmProduct.sale && confirmProduct.sale_proce > 0 ? (
                    <>
                      <span className="price-sale">
                        ${confirmProduct.sale_proce.toFixed(2)}
                      </span>
                      <span className="price-original margin-left-sm">
                        ${confirmProduct.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="price">
                      ${confirmProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-row flex-gap-md">
              <button
                onClick={cancelAddToCart}
                className="btn-secondary btn-full"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddToCart}
                className="btn-primary btn-full"
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

