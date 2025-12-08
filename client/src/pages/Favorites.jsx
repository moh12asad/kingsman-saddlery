import { useEffect, useState } from "react";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";
import { FaHeart, FaShoppingCart } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Favorites() {
  const { favorites, removeFavorite, isLoaded: favoritesLoaded } = useFavorites();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const { t, language } = useLanguage();
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
          <p className="margin-top-md text-muted">{t("favorites.loadingFavorites")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 page-with-navbar">
      <div className="container-main padding-y-xl">
        <div className="flex-row flex-gap-md margin-bottom-lg" style={{ alignItems: 'center' }}>
          <FaHeart className="text-red-500" style={{ fontSize: '1.5rem' }} />
          <h1 className="heading-1">{t("favorites.myFavorites")}</h1>
          {favoriteProducts.length > 0 && (
            <span className="text-muted">({favoriteProducts.length} {t("favorites.items")})</span>
          )}
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="card-empty">
            <FaHeart className="text-muted" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <h2 className="heading-3 margin-bottom-sm">{t("favorites.noFavoritesYet")}</h2>
            <p className="text-muted margin-bottom-md">
              {t("favorites.startAddingProducts")}
            </p>
            <a href="/shop" className="btn-primary">
              {t("favorites.browseProducts")}
            </a>
          </div>
        ) : (
          <div className="grid-products">
            {favoriteProducts.map((product) => {
              const productName = getTranslatedContent(product.name, language);
              const productCategory = getTranslatedContent(product.category, language);
              return (
                <div key={product.id} className="card-product">
                <div className="relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={productName}
                      className="img-product"
                    />
                  ) : (
                    <div className="img-placeholder">No image</div>
                  )}
                  <button
                    className="card-product-favorite active"
                    onClick={() => removeFavorite(product.id)}
                    aria-label={t("favorites.removeFromFavorites")}
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
                    {productName}
                  </h3>
                  {product.category && (
                    <p className="text-xs text-muted margin-bottom-sm">{productCategory}</p>
                  )}
                  <div className="flex-row flex-gap-sm margin-bottom-md">
                    {product.sale && product.sale_proce > 0 ? (
                      <>
                        <span className="price-sale">
                          {formatPrice(product.sale_proce)}
                        </span>
                        <span className="price-original">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="price">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition"
                  >
                    <FaShoppingCart style={{ marginRight: '0.5rem' }} />
                    {t("product.addToCart")}
                  </button>
                </div>
              </div>
            );
            })}
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
            <h2 className="heading-3 margin-bottom-md">{t("favorites.addToCartQuestion")}</h2>
            <div className="flex-row flex-gap-md margin-bottom-lg">
              {confirmProduct.image ? (
                <img
                  src={confirmProduct.image}
                  alt={getTranslatedContent(confirmProduct.name, language)}
                  className="img-cart"
                />
              ) : (
                <div className="img-placeholder">
                  No image
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold heading-3">{getTranslatedContent(confirmProduct.name, language)}</h3>
                {confirmProduct.category && (
                  <p className="text-small text-muted">{getTranslatedContent(confirmProduct.category, language)}</p>
                )}
                {confirmProduct.description && (
                  <p className="text-small text-muted margin-top-sm">{getTranslatedContent(confirmProduct.description, language)}</p>
                )}
                <div className="margin-top-sm">
                  {confirmProduct.sale && confirmProduct.sale_proce > 0 ? (
                    <>
                      <span className="price-sale">
                        {formatPrice(confirmProduct.sale_proce)}
                      </span>
                      <span className="price-original margin-left-sm">
                        {formatPrice(confirmProduct.price)}
                      </span>
                    </>
                  ) : (
                    <span className="price">
                      {formatPrice(confirmProduct.price)}
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
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmAddToCart}
                className="btn-primary btn-full"
              >
                {t("product.addToCart")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

