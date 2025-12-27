import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { getTranslated } from "../utils/translations";
import { FaHeart, FaShoppingCart } from "react-icons/fa";
import FlyToCartAnimation from "../components/FlyToCartAnimation";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Favorites() {
  const navigate = useNavigate();
  const { favorites, removeFavorite, isLoaded: favoritesLoaded } = useFavorites();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animationTrigger, setAnimationTrigger] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        // Get current language for translation
        const lang = i18n.language || 'en';
        const response = await fetch(`${API}/api/products?lang=${lang}`);
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
  }, [i18n.language]);

  // Get full product details for favorites
  const favoriteProducts = favorites.map(fav => {
    const fullProduct = products.find(p => p.id === fav.id);
    return fullProduct || fav;
  }).filter(Boolean);

  const handleAddToCart = (product) => {
    setConfirmProduct(product);
  };

  const confirmAddToCart = (e) => {
    if (confirmProduct) {
      addToCart(confirmProduct);
      
      // Trigger animation if button was clicked
      if (e && e.currentTarget) {
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const position = {
          x: buttonRect.left + buttonRect.width / 2 - 30,
          y: buttonRect.top + buttonRect.height / 2 - 30
        };
        setAnimationTrigger({
          productImage: confirmProduct.image,
          startPosition: position
        });
      }
      
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
          <p className="margin-top-md text-muted">{t("favorites.loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 page-with-navbar">
      <div className="container-main padding-y-xl">
        <div 
          className="flex-row flex-gap-md margin-bottom-lg" 
          style={{ 
            alignItems: 'center',
            justifyContent: currentLanguage === 'ar' || currentLanguage === 'he' ? 'flex-end' : 'flex-start',
            flexDirection: currentLanguage === 'ar' || currentLanguage === 'he' ? 'row-reverse' : 'row'
          }}
        >
          <FaHeart className="text-red-500" style={{ fontSize: '1.5rem' }} />
          <h1 className="heading-1">{t("favorites.title")}</h1>
          {favoriteProducts.length > 0 && (
            <span className="text-muted">({favoriteProducts.length} {t("favorites.items")})</span>
          )}
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="card-empty">
            <FaHeart className="text-muted" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <h2 className="heading-3 margin-bottom-sm">{t("favorites.noFavorites")}</h2>
            <p className="text-muted margin-bottom-md">
              {t("favorites.noFavoritesMessage")}
            </p>
            <a href="/shop" className="btn-primary">
              {t("favorites.browseProducts")}
            </a>
          </div>
        ) : (
          <div className="grid-products">
            {favoriteProducts.map((product) => {
              const handleCardClick = () => {
                navigate(`/product/${product.id}`);
              };

              const handleFavoriteClick = (e) => {
                e.stopPropagation();
                removeFavorite(product.id);
              };

              const handleAddToCartClick = (e) => {
                e.stopPropagation();
                handleAddToCart(product);
              };

              return (
                <div 
                  key={product.id} 
                  className="card-product"
                  onClick={handleCardClick}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={getTranslated(product.name, i18n.language || 'en')}
                        className="img-product"
                      />
                    ) : (
                      <div className="img-placeholder">{t("cart.noImage")}</div>
                    )}
                    <button
                      className="card-product-favorite active"
                      onClick={handleFavoriteClick}
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
                      {getTranslated(product.name, i18n.language || 'en')}
                    </h3>
                    {product.category && (
                      <p className="text-xs text-muted margin-bottom-sm">{getTranslated(product.category, i18n.language || 'en')}</p>
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
                      onClick={handleAddToCartClick}
                      className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition"
                    >
                      <FaShoppingCart style={{ marginRight: '0.5rem' }} />
                      {t("favorites.addToCart")}
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
            <h2 className="heading-3 margin-bottom-md">{t("favorites.addToCartConfirm")}</h2>
            <div className="flex-row flex-gap-md margin-bottom-lg">
              {confirmProduct.image ? (
                <img
                  src={confirmProduct.image}
                  alt={getTranslated(confirmProduct.name, i18n.language || 'en')}
                  className="img-cart"
                />
              ) : (
                <div className="img-placeholder">
                  {t("cart.noImage")}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold heading-3">{getTranslated(confirmProduct.name, i18n.language || 'en')}</h3>
                {confirmProduct.category && (
                  <p className="text-small text-muted">{getTranslated(confirmProduct.category, i18n.language || 'en')}</p>
                )}
                {confirmProduct.description && (
                  <p className="text-small text-muted margin-top-sm">{getTranslated(confirmProduct.description, i18n.language || 'en')}</p>
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
                {t("favorites.addToCart")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fly to Cart Animation */}
      {animationTrigger && (
        <FlyToCartAnimation
          productImage={animationTrigger.productImage}
          startPosition={animationTrigger.startPosition}
          onComplete={() => setAnimationTrigger(null)}
        />
      )}
    </main>
  );
}

