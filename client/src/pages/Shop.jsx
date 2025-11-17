import { useEffect, useState, useMemo, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { FaSearch, FaTimes, FaChevronLeft, FaChevronRight, FaBars, FaHeart, FaShoppingCart } from "react-icons/fa";
import HeroCarousel from "../components/HeroCarousel";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

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

        setAllProducts(availableProducts);
        setProducts(availableProducts);
      } catch (err) {
        setError(err.message || "Failed to load products");
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = ["all", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    return cats;
  }, [allProducts]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query))
      );
    }

    // Separate sale products
    const saleProducts = filtered.filter(p => p.sale);
    
    // Group regular products by category
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

    return { saleProducts, productsByCategory };
  }, [allProducts, selectedCategory, searchQuery]);

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
      <main className="min-h-screen bg-gray-50">
        <div className="container-main padding-y-xl">
          <div className="text-center">
            <div className="loading-spinner"></div>
            <p className="margin-top-md text-muted">Loading products...</p>
          </div>
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
      {/* Hero Carousel */}
      <HeroCarousel />

      <div className="shop-layout">
        {/* Mobile Menu Button */}
        <button
          className="shop-mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle categories menu"
        >
          <FaBars />
        </button>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="shop-mobile-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Fixed Left Sidebar - Categories */}
        <aside className={`shop-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
          <div className="shop-sidebar-content">
            <h2 className="shop-sidebar-title">Categories</h2>
            <nav className="shop-sidebar-nav">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSidebarOpen(false);
                  }}
                  className={`shop-category-button ${
                    selectedCategory === category ? "shop-category-button-active" : ""
                  }`}
                >
                  {category === "all" ? "All Products" : category}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="shop-main-content">
          {/* Search Bar */}
          <div className="shop-search-container">
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
            <>
              <section className="shop-section">
                <div className="shop-section-header">
                  <div className="shop-section-title-wrapper">
                    <h2 className="shop-section-title">On Sale</h2>
                  </div>
                </div>
                <ProductCarousel products={filteredProducts.saleProducts} onAddToCart={handleAddToCart} />
              </section>

              {/* Hero Overlay after Sale Section */}
              <CategoryHeroOverlay 
                category="On Sale"
                title="Discover Amazing Deals"
                subtitle="Shop our exclusive sale collection and save on premium equestrian equipment"
              />
            </>
          )}

          {/* Category Products Sections with Hero Overlays */}
          {Object.entries(filteredProducts.productsByCategory).map(([category, products], index) => (
            <div key={category}>
              {/* Category Products Section */}
              <section className="shop-section">
                <div className="shop-section-title-wrapper">
                  <h2 className="shop-section-title">{category}</h2>
                </div>
                <ProductCarousel products={products} onAddToCart={handleAddToCart} />
              </section>

              {/* Hero Overlay after each category section */}
              <CategoryHeroOverlay 
                category={category}
                title={`Explore ${category}`}
                subtitle={`Discover our premium ${category.toLowerCase()} collection`}
              />
            </div>
          ))}

          {/* No Results */}
          {filteredProducts.saleProducts.length === 0 && Object.keys(filteredProducts.productsByCategory).length === 0 && (
            <div className="shop-empty">
              <p className="shop-empty-text">No products found</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="btn-link"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
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

// Category Hero Overlay Component
function CategoryHeroOverlay({ category, title, subtitle }) {
  // Hero images - using reliable Unsplash source URLs
  const heroImages = [
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516726817505-2a5bc90e8d03?w=1920&h=600&fit=crop",
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=600&fit=crop"
  ];
  
  // Use category name to get consistent image per category
  const imageIndex = category.length % heroImages.length;
  const backgroundImage = heroImages[imageIndex];

  return (
    <div 
      className="category-hero-overlay"
      style={{ 
        backgroundImage: `url(${backgroundImage})`
      }}
    >
      <div className="category-hero-overlay-content">
        <h2 className="category-hero-title">{title}</h2>
        <p className="category-hero-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

// Product Carousel Component
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
      
      // Disable manual scrolling - only allow arrow navigation
      const preventScroll = (e) => {
        if (e.type === 'wheel') {
          e.preventDefault();
        }
      };
      
      scrollElement.addEventListener('wheel', preventScroll, { passive: false });
      scrollElement.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        scrollElement.removeEventListener('wheel', preventScroll);
        scrollElement.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [products]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const cardWidth = 280; // Match the card width + gap
      const scrollAmount = cardWidth + 20; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (products.length === 0) return null;

  // Check if carousel is scrollable
  const isScrollable = products.length > 0;

  return (
    <div className="product-carousel-container">
      {isScrollable && (
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
  const { toggleFavorite, isFavorite: checkFavorite } = useFavorites();
  const isFav = checkFavorite(product.id);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(product);
  };

  return (
    <div className="card-product-carousel">
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
          onClick={() => onAddToCart(product)}
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
