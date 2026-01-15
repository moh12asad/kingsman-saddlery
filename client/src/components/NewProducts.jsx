import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCurrency } from "../context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { getTranslated } from "../utils/translations";
import { FaChevronLeft, FaChevronRight, FaHeart, FaShoppingCart } from "react-icons/fa";
import FlyToCartAnimation from "./FlyToCartAnimation";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function NewProducts() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();
  const scrollRef = useRef(null);
  const [animationTrigger, setAnimationTrigger] = useState(null);

  useEffect(() => {
    async function loadBrands() {
      try {
        const response = await fetch(`${API}/api/brands`);
        if (response.ok) {
          const data = await response.json();
          setBrands(data.brands || []);
        }
      } catch (err) {
        console.error("Error loading brands:", err);
      }
    }

    loadBrands();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const lang = i18n.language || 'en';
        const response = await fetch(`${API}/api/products?lang=${lang}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch products");
        }

        const availableProducts = (data.products || []).filter(
          (product) => product.available === true
        );

        // Match brands with products
        const productsWithBrands = availableProducts.map(product => {
          if (product.brand) {
            const matchedBrand = brands.find(b => b.name === product.brand);
            if (matchedBrand && matchedBrand.logo) {
              return { ...product, brandLogo: matchedBrand.logo };
            }
          }
          return product;
        });

        // Filter new products (created within last 30 days)
        const now = new Date();
        const daysForNew = 30;
        
        const parseDate = (product) => {
          if (!product.createdAt) {
            if (product.updatedAt) {
              if (product.updatedAt.toDate && typeof product.updatedAt.toDate === 'function') {
                return product.updatedAt.toDate();
              } else if (product.updatedAt.seconds) {
                return new Date(product.updatedAt.seconds * 1000);
              } else if (typeof product.updatedAt === 'string') {
                return new Date(product.updatedAt);
              }
            }
            return null;
          }
          
          if (product.createdAt.toDate && typeof product.createdAt.toDate === 'function') {
            return product.createdAt.toDate();
          } else if (product.createdAt.seconds) {
            return new Date(product.createdAt.seconds * 1000);
          } else if (typeof product.createdAt === 'string') {
            return new Date(product.createdAt);
          } else if (product.createdAt instanceof Date) {
            return product.createdAt;
          }
          return new Date(product.createdAt);
        };
        
        const newProducts = productsWithBrands
          .map(p => ({ product: p, date: parseDate(p) }))
          .filter(({ date }) => {
            if (!date || isNaN(date.getTime())) return false;
            const daysSinceCreation = (now - date) / (1000 * 60 * 60 * 24);
            return daysSinceCreation <= daysForNew && daysSinceCreation >= 0;
          })
          .sort((a, b) => {
            const dateA = a.date || new Date(0);
            const dateB = b.date || new Date(0);
            return dateB - dateA; // Newest first
          })
          .map(({ product }) => product)
          .slice(0, 20); // Show up to 20 new products

        setProducts(newProducts);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [i18n.language, brands]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const cardWidth = 280;
      const scrollAmount = cardWidth + 20;
      const effectiveDirection = isRTL ? (direction === 'left' ? 'right' : 'left') : direction;
      scrollRef.current.scrollBy({
        left: effectiveDirection === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="products-section">
        <div className="text-center py-12">
          <p className="text-gray-500">{t("products.loading")}</p>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no new products
  }

  return (
    <section className="products-section">
      <div className="products-section-header">
        <h2 className="products-section-title">{t("shop.tabs.new")}</h2>
      </div>

      <div className="products-tabs-content">
        <div className="product-carousel-container">
          {products.length > 0 && (
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
            {products.map((product) => (
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
    
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: buttonRect.left + buttonRect.width / 2 - 30,
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
        <div className="card-product-image-container">
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
              <span className="badge-text">{t("shop.common.sale")}</span>
            </span>
          )}
        </div>
        {product.brandLogo && (
          <div className="card-product-logo-section">
            <img
              src={product.brandLogo}
              alt={product.brand || ''}
              className="card-product-logo"
            />
          </div>
        )}
      </div>
      <div className="card-product-content">
        <h3 className="card-product-title">
          {getTranslated(product.name, i18n.language || 'en')}
        </h3>
        <div className="card-product-separator"></div>
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
            className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition"
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

