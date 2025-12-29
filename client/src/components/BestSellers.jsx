import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCurrency } from "../context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { getTranslated } from "../utils/translations";
import { FaChevronLeft, FaChevronRight, FaHeart, FaShoppingCart } from "react-icons/fa";
import { auth } from "../lib/firebase";
import FlyToCartAnimation from "./FlyToCartAnimation";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function BestSellers() {
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();
  const scrollRef = useRef(null);
  const [animationTrigger, setAnimationTrigger] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Get current language for translation
        const lang = i18n.language || 'en';
        
        // Load products
        const productsRes = await fetch(`${API}/api/products?lang=${lang}`);
        if (!productsRes.ok) {
          throw new Error("Failed to fetch products");
        }
        const productsData = await productsRes.json();
        const availableProducts = (productsData.products || []).filter(
          (product) => product.available === true
        );
        setProducts(availableProducts);

        // Load best seller product IDs
        const bestSellersRes = await fetch(`${API}/api/orders/best-sellers`);
        
        if (bestSellersRes.ok) {
          const bestSellersData = await bestSellersRes.json();
          const bestSellerIds = bestSellersData.productIds || [];

          // Get product details for best sellers
          const bestSellerProducts = bestSellerIds
            .map(id => availableProducts.find(p => p.id === id))
            .filter(Boolean); // Remove undefined products

          setBestSellers(bestSellerProducts);
        } else {
          // If best sellers can't be loaded, show empty
          setBestSellers([]);
        }
      } catch (err) {
        console.error("Error loading best sellers:", err);
        setBestSellers([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [i18n.language]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const cardWidth = 280;
      const scrollAmount = cardWidth + 20;
      // In RTL, scroll direction is reversed
      const effectiveDirection = isRTL ? (direction === 'left' ? 'right' : 'left') : direction;
      scrollRef.current.scrollBy({
        left: effectiveDirection === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="best-sellers-section">
        <div className="text-center py-12">
          <p className="text-gray-500">{t("shop.bestSellers.loading")}</p>
        </div>
      </section>
    );
  }

  if (bestSellers.length === 0) {
    return null; // Don't show section if no best sellers
  }

  return (
    <section className="best-sellers-section">
      <div className="best-sellers-header">
        <h2 className="best-sellers-title">{t("shop.bestSellers.title")}</h2>
      </div>

      <div className="products-tabs-content">
        <div className="product-carousel-container">
          {bestSellers.length > 0 && (
            <>
              <button
                className="product-carousel-arrow product-carousel-arrow-left"
                onClick={() => scroll('left')}
                aria-label={t("shop.common.scrollLeft")}
              >
                {isRTL ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
              <button
                className="product-carousel-arrow product-carousel-arrow-right"
                onClick={() => scroll('right')}
                aria-label={t("shop.common.scrollRight")}
              >
                {isRTL ? <FaChevronLeft /> : <FaChevronRight />}
              </button>
            </>
          )}
          <div className="product-carousel" ref={scrollRef}>
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(position) => {
                  addToCart(product);
                  setAnimationTrigger({
                    productImage: product.image,
                    startPosition: position
                  });
                }}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={() => toggleFavorite(product)}
              />
            ))}
          </div>
        </div>
      </div>
      {animationTrigger && (
        <FlyToCartAnimation
          productImage={animationTrigger.productImage}
          startPosition={animationTrigger.startPosition}
          onComplete={() => setAnimationTrigger(null)}
        />
      )}
    </section>
  );
}

function ProductCard({ product, onAddToCart, isFavorite, onToggleFavorite }) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get button position for animation
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: buttonRect.left + buttonRect.width / 2 - 30, // Center minus half image width
      y: buttonRect.top + buttonRect.height / 2 - 30
    };
    
    onAddToCart(position);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div className="card-product-carousel" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="card-product-image-wrapper">
        {product.image ? (
          <img
            src={product.image}
            alt={getTranslated(product.name, i18n.language || 'en')}
            className="card-product-image"
          />
        ) : (
          <div className="card-product-placeholder">
            {t("cart.noImage")}
          </div>
        )}
        <button
          className={`card-product-favorite ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? t("shop.common.removeFromFavorites") : t("shop.common.addToFavorites")}
        >
          <FaHeart />
        </button>
        {product.sale && (
          <span className="card-product-badge">
            {t("shop.common.sale")}
          </span>
        )}
      </div>
      <div className="card-product-content">
        <h3 className="card-product-title">
          {getTranslated(product.name, i18n.language || 'en')}
        </h3>
        <div className="card-product-price">
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
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={handleAddToCartClick}
            className="btn btn-secondary btn-full padding-x-md padding-y-sm text-small font-medium transition"
            style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto', width: '100%' }}
          >
            <FaShoppingCart style={{ marginRight: '0.5rem' }} />
            {t("products.addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}

