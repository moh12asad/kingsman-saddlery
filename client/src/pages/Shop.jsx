import { useEffect, useState, useMemo } from "react";
import { useCart } from "../context/CartContext";
import { FaSearch, FaTimes } from "react-icons/fa";

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

    // Separate sale and regular products
    const saleProducts = filtered.filter(p => p.sale);
    const regularProducts = filtered.filter(p => !p.sale);

    return { saleProducts, regularProducts };
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
    <main className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="header-hero">
        <div className="container-main">
          <h1 className="header-title">Kingsman Saddlery</h1>
          <p className="header-subtitle">Premium Equestrian Equipment & Supplies</p>
        </div>
      </div>

      <div className="container-main padding-y-lg">
        <div className="flex-row flex-gap-lg" style={{ alignItems: 'flex-start' }}>
          {/* Sidebar - Categories */}
          <aside className={`sidebar-filter ${sidebarOpen ? 'sidebar-filter-open' : ''}`}>
            <div className="sidebar-content">
              <div className="flex-row-between margin-bottom-md lg:hidden">
                <h2 className="sidebar-title">Categories</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-muted transition"
                >
                  <FaTimes />
                </button>
              </div>
              <h2 className="sidebar-title hidden lg:block">Categories</h2>
              <div className="spacing-y-sm">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSidebarOpen(false);
                    }}
                    className={`category-button ${
                      selectedCategory === category ? "category-button-active" : ""
                    }`}
                  >
                    {category === "all" ? "All Products" : category}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1" style={{ order: 2, minWidth: 0 }}>
            {/* Search Bar */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="search-clear"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Category Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden margin-bottom-md w-full card flex-row-between transition"
            >
              <span className="font-medium">Filter by Category</span>
              <span className="text-small text-muted">
                {selectedCategory === "all" ? "All Products" : selectedCategory}
              </span>
            </button>

            {/* Sale Products Section */}
            {filteredProducts.saleProducts.length > 0 && (
              <section className="margin-bottom-xl">
                <div className="flex-row flex-gap-md margin-bottom-md">
                  <h2 className="heading-2">On Sale</h2>
                  <span className="badge-sale">
                    {filteredProducts.saleProducts.length} items
                  </span>
                </div>
                <div className="grid-products">
                  {filteredProducts.saleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Regular Products Section */}
            {filteredProducts.regularProducts.length > 0 && (
              <section>
                <h2 className="heading-2 margin-bottom-md">
                  {filteredProducts.saleProducts.length > 0 ? "All Products" : "Products"}
                </h2>
                <div className="grid-products">
                  {filteredProducts.regularProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* No Results */}
            {filteredProducts.saleProducts.length === 0 && filteredProducts.regularProducts.length === 0 && (
              <div className="card-empty">
                <p className="text-muted heading-3 margin-bottom-md">No products found</p>
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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed z-40 hidden lg:block"
          style={{ inset: 0, background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </main>
  );
}

// Product Card Component
function ProductCard({ product, onAddToCart }) {
  return (
    <div className="card-product">
      <div className="relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="img-product transition"
            style={{ transform: 'scale(1)' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div className="img-placeholder">
            No image
          </div>
        )}
        {product.sale && (
          <span className="badge-sale absolute" style={{ top: '0.5rem', right: '0.5rem' }}>
            SALE
          </span>
        )}
      </div>
      <div className="padding-sm flex-col flex-1">
        <h3 className="font-semibold text-small text-truncate-2 margin-bottom-sm" style={{ minHeight: '2.5rem' }}>
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
          onClick={() => onAddToCart(product)}
          className="btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
