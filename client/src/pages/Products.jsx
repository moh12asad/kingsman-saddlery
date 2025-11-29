import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { FaSearch, FaTimes, FaChevronLeft, FaChevronRight, FaHeart, FaShoppingCart } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Products() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const categoryParam = searchParams.get("category");
  const subcategoryParam = searchParams.get("subcategory");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/products`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch products");
        }

        const availableProducts = (data.products || []).filter(
          (product) => product.available === true
        );

        setAllProducts(availableProducts);
      } catch (err) {
        setError(err.message || "Failed to load products");
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Filter products based on search, category, and sub-category
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Filter by category
    if (categoryParam) {
      const decodedCategory = decodeURIComponent(categoryParam);
      filtered = filtered.filter(p => p.category === decodedCategory);
      
      // Filter by sub-category if selected
      if (subcategoryParam) {
        const decodedSubCategory = decodeURIComponent(subcategoryParam);
        filtered = filtered.filter(p => p.subCategory === decodedSubCategory);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(query))
      );
    }

    // Separate sale products
    const saleProducts = filtered.filter(p => p.sale);
    
    // Group regular products by category and sub-category
    const productsByCategory = {};
    
    filtered
      .filter(p => !p.sale)
      .forEach(product => {
        const category = product.category || "Uncategorized";
        if (!productsByCategory[category]) {
          productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
      });

    return { 
      saleProducts, 
      productsByCategory 
    };
  }, [allProducts, categoryParam, subcategoryParam, searchQuery]);

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
          <h1 className="text-3xl font-bold">
            {subcategoryParam 
              ? decodeURIComponent(subcategoryParam)
              : categoryParam 
              ? decodeURIComponent(categoryParam)
              : "All Products"}
          </h1>
          {categoryParam && subcategoryParam && (
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
  const { toggleFavorite, isFavorite: checkFavorite } = useFavorites();
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
            alt={product.name}
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
          {product.name}
        </h3>
        <div className="card-product-price">
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
          onClick={handleAddToCartClick}
          className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition margin-top-sm"
          style={{ marginTop: '0.75rem' }}
        >
          <FaShoppingCart style={{ marginRight: '0.5rem' }} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}


