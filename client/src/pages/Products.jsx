import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCurrency } from "../context/CurrencyContext";
import { getTranslated } from "../utils/translations";
import { auth } from "../lib/firebase";
import { FaSearch, FaTimes, FaChevronLeft, FaChevronRight, FaHeart, FaShoppingCart } from "react-icons/fa";
import FlyToCartAnimation from "../components/FlyToCartAnimation";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Products() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Store categories for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [animationTrigger, setAnimationTrigger] = useState(null);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();

  const categoryParam = searchParams.get("category");
  const subcategoryParam = searchParams.get("subcategory");
  const brandParam = searchParams.get("brand");
  const shouldFocusSearch = searchParams.get("search") === "true";
  const searchInputRef = useRef(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        // Get current language for translation
        const lang = i18n.language || 'en';
        const response = await fetch(`${API}/api/products?lang=${lang}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || t("products.failedToFetch"));
        }

        const availableProducts = (data.products || []).filter(
          (product) => product.available === true
        );

        setAllProducts(availableProducts);
      } catch (err) {
        setError(err.message || t("products.failedToLoad"));
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadCategories() {
      try {
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        const categoriesRes = await fetch(`${API}/api/categories?all=true`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    }

    loadProducts();
    loadCategories();
  }, [i18n.language]);

  // Focus search input when opened from navbar
  useEffect(() => {
    if (shouldFocusSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        // Remove the search parameter from URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete("search");
        navigate(`/products?${newSearchParams.toString()}`, { replace: true });
      }, 100);
    }
  }, [shouldFocusSearch, searchParams, navigate]);

  // Filter products based on search, category, sub-category, and brand
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Filter by brand
    if (brandParam) {
      const decodedBrand = decodeURIComponent(brandParam);
      filtered = filtered.filter(p => p.brand === decodedBrand);
    }

    // Filter by category
    if (categoryParam) {
      const decodedCategory = decodeURIComponent(categoryParam);
      
      // Find category that matches the decoded name in any language
      // Products store category/subcategory as English strings, so we need to find the English name
      const matchedCategory = categories.find(cat => {
        const catNameEn = getTranslated(cat.name, 'en');
        const catNameAr = getTranslated(cat.name, 'ar');
        const catNameHe = getTranslated(cat.name, 'he');
        return catNameEn === decodedCategory || 
               catNameAr === decodedCategory || 
               catNameHe === decodedCategory;
      });
      
      if (matchedCategory) {
        const categoryNameEn = getTranslated(matchedCategory.name, 'en');
        filtered = filtered.filter(p => {
          // Products have category stored as string (usually English)
          const pCategory = typeof p.category === 'string' ? p.category : getTranslated(p.category, 'en');
          return pCategory === categoryNameEn;
        });
        
        // Filter by sub-category if selected
        if (subcategoryParam) {
          const decodedSubCategory = decodeURIComponent(subcategoryParam);
          // Find subcategory that matches in any language
          const matchedSubCategory = (matchedCategory.subCategories || []).find(sub => {
            const subNameEn = getTranslated(sub.name, 'en');
            const subNameAr = getTranslated(sub.name, 'ar');
            const subNameHe = getTranslated(sub.name, 'he');
            return subNameEn === decodedSubCategory || 
                   subNameAr === decodedSubCategory || 
                   subNameHe === decodedSubCategory;
          });
          
          if (matchedSubCategory) {
            const subCategoryNameEn = getTranslated(matchedSubCategory.name, 'en');
            filtered = filtered.filter(p => {
              const pSubCategory = typeof p.subCategory === 'string' ? p.subCategory : getTranslated(p.subCategory, 'en');
              return pSubCategory === subCategoryNameEn;
            });
          }
        }
      } else {
        // Fallback: if category not found in categories list, use direct comparison
        const currentLang = i18n.language || 'en';
        filtered = filtered.filter(p => {
          const pCategory = typeof p.category === 'string' ? p.category : getTranslated(p.category, currentLang);
          return pCategory === decodedCategory;
        });
        
        if (subcategoryParam) {
          const decodedSubCategory = decodeURIComponent(subcategoryParam);
          filtered = filtered.filter(p => {
            const pSubCategory = typeof p.subCategory === 'string' ? p.subCategory : getTranslated(p.subCategory, currentLang);
            return pSubCategory === decodedSubCategory;
          });
        }
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const currentLang = i18n.language || 'en';
      filtered = filtered.filter(p => {
        const name = getTranslated(p.name, currentLang).toLowerCase();
        const category = getTranslated(p.category, currentLang).toLowerCase();
        const subCategory = getTranslated(p.subCategory, currentLang).toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        return name.includes(query) ||
          category.includes(query) ||
          subCategory.includes(query) ||
          brand.includes(query);
      });
    }

    // Separate sale products
    const saleProducts = filtered.filter(p => p.sale);
    
    // Group regular products by category and sub-category
    const productsByCategory = {};
    const currentLang = i18n.language || 'en';
    
    filtered
      .filter(p => !p.sale)
      .forEach(product => {
        const category = getTranslated(product.category, currentLang) || "Uncategorized";
        if (!productsByCategory[category]) {
          productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
      });

    return { 
      saleProducts, 
      productsByCategory 
    };
  }, [allProducts, categories, categoryParam, subcategoryParam, brandParam, searchQuery, i18n.language]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 loading-container">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="margin-top-md text-muted">{t("products.loading")}</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container-main padding-y-xl">
          <div className="text-center">
            <p className="text-error heading-3">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shop-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 margin-top-xl">
          <button
            onClick={() => navigate("/shop")}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2"
          >
            {t("products.backToShop")}
          </button>
          <h1 className="text-3xl font-bold">
            {brandParam
              ? `${decodeURIComponent(brandParam)} ${t("products.productsLabel")}`
              : subcategoryParam 
              ? decodeURIComponent(subcategoryParam)
              : categoryParam 
              ? decodeURIComponent(categoryParam)
              : t("products.allProducts")}
          </h1>
          {brandParam && (
            <p className="text-gray-600 mt-2">
              {t("products.showingProductsFromBrand")} <strong>{decodeURIComponent(brandParam)}</strong>
            </p>
          )}
          {categoryParam && subcategoryParam && !brandParam && (
            <p className="text-gray-600 mt-2">
              {decodeURIComponent(categoryParam)} → {decodeURIComponent(subcategoryParam)}
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className="shop-search-container mb-6">
          <div className="shop-search-wrapper">
            <FaSearch className="shop-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t("products.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shop-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="shop-search-clear"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* Sale Products Section */}
        {filteredProducts.saleProducts.length > 0 && (
          <section className="shop-section mb-8">
            <div className="shop-section-header">
              <div className="shop-section-title-wrapper">
                <h2 className="shop-section-title">{t("products.onSale")}</h2>
              </div>
            </div>
            <ProductCarousel products={filteredProducts.saleProducts} onAddToCart={handleAddToCart} />
          </section>
        )}

        {/* Category Products Sections */}
        {Object.entries(filteredProducts.productsByCategory).map(([category, products]) => (
          <section key={category} className="shop-section mb-8">
            <div className="shop-section-title-wrapper">
              <h2 className="shop-section-title">{category}</h2>
            </div>
            <ProductGrid products={products} onAddToCart={handleAddToCart} />
          </section>
        ))}

        {/* No Results */}
        {filteredProducts.saleProducts.length === 0 && Object.keys(filteredProducts.productsByCategory).length === 0 && (
          <div className="shop-empty">
            <p className="shop-empty-text">{t("products.noProducts")}</p>
            <button
              onClick={() => {
                setSearchQuery("");
                navigate("/products");
              }}
              className="btn-link"
            >
              {t("products.clearFilters")}
            </button>
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
            <h2 className="heading-3 margin-bottom-md">{t("products.addToCartConfirm")}</h2>
            <div className="flex-row flex-gap-md margin-bottom-lg">
              {confirmProduct.image ? (
                <img
                  src={confirmProduct.image}
                  alt={getTranslated(confirmProduct.name, i18n.language || 'en')}
                  className="img-cart"
                />
              ) : (
                <div className="img-placeholder">
                  {t("products.noImage")}
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
                className="btn btn-secondary btn-full"
              >
                {t("products.addToCart")}
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

// Product Grid Component (for regular products)
function ProductGrid({ products, onAddToCart }) {
  if (products.length === 0) return null;

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

// Product Carousel Component (for sale products)
function ProductCarousel({ products, onAddToCart }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [products]);

  // Center the carousel on initial load
  useEffect(() => {
    if (scrollRef.current && products.length > 0) {
      let attempts = 0;
      const maxAttempts = 10;
      
      const centerCarousel = () => {
        if (scrollRef.current && attempts < maxAttempts) {
          const containerWidth = scrollRef.current.clientWidth;
          const scrollWidth = scrollRef.current.scrollWidth;
          
          // Only center if we have valid dimensions
          if (scrollWidth > 0 && containerWidth > 0 && scrollWidth > containerWidth) {
            // Calculate center position to show middle products
            const centerPosition = (scrollWidth - containerWidth) / 2;
            scrollRef.current.scrollLeft = centerPosition;
            checkScroll();
            return true; // Successfully centered
          } else if (scrollWidth === 0 || containerWidth === 0) {
            // Layout not ready yet, try again
            attempts++;
            setTimeout(centerCarousel, 50);
            return false;
          }
        }
        return true;
      };
      
      // Start centering after a short delay
      setTimeout(() => {
        requestAnimationFrame(() => {
          centerCarousel();
        });
      }, 150);
    }
  }, [products]);

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

  if (products.length === 0) return null;

  return (
    <div className="product-carousel-container">
      {products.length > 0 && (
        <>
          <button
            className={`product-carousel-arrow product-carousel-arrow-left ${!showLeftArrow ? 'disabled' : ''}`}
            onClick={() => scroll('left')}
            aria-label={t("products.scrollLeft")}
            disabled={!showLeftArrow}
          >
            {isRTL ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
          <button
            className={`product-carousel-arrow product-carousel-arrow-right ${!showRightArrow ? 'disabled' : ''}`}
            onClick={() => scroll('right')}
            aria-label={t("products.scrollRight")}
            disabled={!showRightArrow}
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
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toggleFavorite, isFavorite: checkFavorite } = useFavorites();
  const { formatPrice } = useCurrency();
  const isFav = checkFavorite(product.id);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(product);
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCartClick = (e) => {
    e.stopPropagation();
    onAddToCart(product);
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
            {t("products.noImage")}
          </div>
        )}
        <button
          className={`card-product-favorite ${isFav ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFav ? t("products.removeFromFavorites") : t("products.addToFavorites")}
        >
          <FaHeart />
        </button>
        {product.sale && (
          <span className="card-product-badge">
            {t("products.sale")}
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
        <button
          onClick={handleAddToCartClick}
          className="btn btn-secondary btn-full padding-x-md padding-y-sm text-small font-medium transition margin-top-sm"
          style={{ marginTop: '0.75rem' }}
        >
          <FaShoppingCart style={{ marginRight: '0.5rem' }} />
          {t("products.addToCart")}
        </button>
      </div>
    </div>
  );
}


