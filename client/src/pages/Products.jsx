import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";
import { useTranslatedContent } from "../hooks/useTranslatedContent";
import { auth } from "../lib/firebase";
import { FaSearch, FaTimes, FaChevronLeft, FaChevronRight, FaHeart, FaShoppingCart } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Products() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { formatPrice } = useCurrency();
  const { t, language } = useLanguage();
  
  // Helper to get text from multilingual or string
  const getText = (field) => {
    if (!field) return "";
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && !Array.isArray(field)) {
      return getTranslatedContent(field, language);
    }
    return "";
  };

  const categoryParam = searchParams.get("category");
  const subcategoryParam = searchParams.get("subcategory");
  const shouldFocusSearch = searchParams.get("search") === "true";
  const searchInputRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Load products
        const response = await fetch(`${API}/api/products`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch products");
        }

        const availableProducts = (data.products || []).filter(
          (product) => product.available === true
        );

        setAllProducts(availableProducts);
        
        // Load categories for matching
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        const categoriesRes = await fetch(`${API}/api/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load products");
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  // Filter products based on search, category, and sub-category
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Filter by category
    if (categoryParam) {
      const decodedCategory = decodeURIComponent(categoryParam);
      
      // Find the category that matches the URL parameter (could be in any language)
      const matchedCategory = categories.find(cat => {
        const catNameEn = getTranslatedContent(cat.name, 'en');
        const catNameAr = getTranslatedContent(cat.name, 'ar');
        const catNameHe = getTranslatedContent(cat.name, 'he');
        return catNameEn === decodedCategory || 
               catNameAr === decodedCategory || 
               catNameHe === decodedCategory;
      });
      
      // Use English name for matching (products may still have old string format)
      const categoryNameEn = matchedCategory 
        ? getTranslatedContent(matchedCategory.name, 'en')
        : decodedCategory; // Fallback to decoded value if category not found
      
      filtered = filtered.filter(p => {
        // Get English name for comparison (products may still have old string format)
        const pCategoryEn = getTranslatedContent(p.category, 'en');
        return pCategoryEn === categoryNameEn;
      });
      
      // Filter by sub-category if selected
      if (subcategoryParam && matchedCategory) {
        const decodedSubCategory = decodeURIComponent(subcategoryParam);
        
        // Find the subcategory that matches the URL parameter
        const matchedSubCategory = (matchedCategory.subCategories || []).find(sub => {
          const subNameEn = getTranslatedContent(sub.name, 'en');
          const subNameAr = getTranslatedContent(sub.name, 'ar');
          const subNameHe = getTranslatedContent(sub.name, 'he');
          return subNameEn === decodedSubCategory || 
                 subNameAr === decodedSubCategory || 
                 subNameHe === decodedSubCategory;
        });
        
        // Use English name for matching
        const subCategoryNameEn = matchedSubCategory
          ? getTranslatedContent(matchedSubCategory.name, 'en')
          : decodedSubCategory; // Fallback to decoded value if subcategory not found
        
        filtered = filtered.filter(p => {
          // Get English name for comparison (products may still have old string format)
          const pSubCategoryEn = getTranslatedContent(p.subCategory, 'en');
          return pSubCategoryEn === subCategoryNameEn;
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const nameText = getText(p.name).toLowerCase();
        const categoryText = getText(p.category).toLowerCase();
        const subCategoryText = getText(p.subCategory).toLowerCase();
        
        return nameText.includes(query) ||
               categoryText.includes(query) ||
               subCategoryText.includes(query);
      });
    }

    // Separate sale products
    const saleProducts = filtered.filter(p => p.sale);
    
    // Group regular products by category (using English name as key for consistency)
    const productsByCategory = {};
    
    filtered
      .filter(p => !p.sale)
      .forEach(product => {
        // Use English name as key for grouping
        const categoryEn = getTranslatedContent(product.category, 'en') || "Uncategorized";
        if (!productsByCategory[categoryEn]) {
          productsByCategory[categoryEn] = [];
        }
        productsByCategory[categoryEn].push(product);
      });

    return { 
      saleProducts, 
      productsByCategory 
    };
  }, [allProducts, categories, categoryParam, subcategoryParam, searchQuery, language]);

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
      <main className="min-h-screen bg-gray-50 loading-container">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="margin-top-md text-muted">Loading products...</p>
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
        <div className="mb-6">
          <button
            onClick={() => navigate("/shop")}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2"
          >
            ← Back to Shop
          </button>
          {(() => {
            // Find the category and subcategory from the categories list to get proper translations
            const decodedCategory = categoryParam ? decodeURIComponent(categoryParam) : null;
            const decodedSubCategory = subcategoryParam ? decodeURIComponent(subcategoryParam) : null;
            
            const matchedCategory = categories.find(cat => {
              const catNameEn = getTranslatedContent(cat.name, 'en');
              const catNameAr = getTranslatedContent(cat.name, 'ar');
              const catNameHe = getTranslatedContent(cat.name, 'he');
              return catNameEn === decodedCategory || 
                     catNameAr === decodedCategory || 
                     catNameHe === decodedCategory;
            });
            
            const categoryDisplayName = matchedCategory 
              ? getTranslatedContent(matchedCategory.name, language)
              : decodedCategory || "All Products";
            
            const matchedSubCategory = matchedCategory && decodedSubCategory
              ? (matchedCategory.subCategories || []).find(sub => {
                  const subNameEn = getTranslatedContent(sub.name, 'en');
                  const subNameAr = getTranslatedContent(sub.name, 'ar');
                  const subNameHe = getTranslatedContent(sub.name, 'he');
                  return subNameEn === decodedSubCategory || 
                         subNameAr === decodedSubCategory || 
                         subNameHe === decodedSubCategory;
                })
              : null;
            
            const subCategoryDisplayName = matchedSubCategory
              ? getTranslatedContent(matchedSubCategory.name, language)
              : decodedSubCategory;
            
            return (
              <>
                <h1 className="text-3xl font-bold">
                  {subCategoryDisplayName || categoryDisplayName}
                </h1>
                {categoryDisplayName && subCategoryDisplayName && (
                  <p className="text-gray-600 mt-2">
                    {categoryDisplayName} → {subCategoryDisplayName}
                  </p>
                )}
              </>
            );
          })()}
        </div>

        {/* Search Bar */}
        <div className="shop-search-container mb-6">
          <div className="shop-search-wrapper">
            <FaSearch className="shop-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products..."
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
                <h2 className="shop-section-title">On Sale</h2>
              </div>
            </div>
            <ProductCarousel products={filteredProducts.saleProducts} onAddToCart={handleAddToCart} />
          </section>
        )}

        {/* Category Products Sections */}
        {Object.entries(filteredProducts.productsByCategory).map(([categoryEn, products]) => {
          // Find the category from categories list to get proper translation
          const matchedCategory = categories.find(cat => {
            const catNameEn = getTranslatedContent(cat.name, 'en');
            return catNameEn === categoryEn;
          });
          
          // Use translated name if category found, otherwise use English name
          const categoryDisplayName = matchedCategory
            ? getTranslatedContent(matchedCategory.name, language)
            : categoryEn;
          
          return (
            <section key={categoryEn} className="shop-section mb-8">
              <div className="shop-section-title-wrapper">
                <h2 className="shop-section-title">{categoryDisplayName}</h2>
              </div>
              <ProductGrid products={products} onAddToCart={handleAddToCart} />
            </section>
          );
        })}

        {/* No Results */}
        {filteredProducts.saleProducts.length === 0 && Object.keys(filteredProducts.productsByCategory).length === 0 && (
          <div className="shop-empty">
            <p className="shop-empty-text">No products found</p>
            <button
              onClick={() => {
                setSearchQuery("");
                navigate("/shop");
              }}
              className="btn-link"
            >
              Clear filters
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
            <h2 className="heading-3 margin-bottom-md">{t("product.addToCartQuestion")}</h2>
            <div className="flex-row flex-gap-md margin-bottom-lg">
              {confirmProduct.image ? (
                <img
                  src={confirmProduct.image}
                  alt={getText(confirmProduct.name)}
                  className="img-cart"
                />
              ) : (
                <div className="img-placeholder">
                  No image
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold heading-3">{getText(confirmProduct.name)}</h3>
                {confirmProduct.category && (
                  <p className="text-small text-muted">{getText(confirmProduct.category)}</p>
                )}
                {confirmProduct.description && (
                  <p className="text-small text-muted margin-top-sm">{getText(confirmProduct.description)}</p>
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
                Cancel
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
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
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
            aria-label="Scroll left"
            disabled={!showLeftArrow}
          >
            <FaChevronLeft />
          </button>
          <button
            className={`product-carousel-arrow product-carousel-arrow-right ${!showRightArrow ? 'disabled' : ''}`}
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            disabled={!showRightArrow}
          >
            <FaChevronRight />
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
  const { t } = useLanguage();
  const { toggleFavorite, isFavorite: checkFavorite } = useFavorites();
  const { formatPrice } = useCurrency();
  const productName = useTranslatedContent(product.name);
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
            alt={productName}
            className="card-product-image"
          />
        ) : (
          <div className="card-product-placeholder">
            No image
          </div>
        )}
        <button
          className={`card-product-favorite ${isFav ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <FaHeart />
        </button>
        {product.sale && (
          <span className="card-product-badge">
            SALE
          </span>
        )}
      </div>
      <div className="card-product-content">
        <h3 className="card-product-title">
          {productName}
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
          className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition margin-top-sm"
          style={{ marginTop: '0.75rem' }}
        >
          <FaShoppingCart style={{ marginRight: '0.5rem' }} />
          {t("product.addToCart")}
        </button>
      </div>
    </div>
  );
}


