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
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Kingsman Saddlery</h1>
          <p className="text-indigo-100 text-lg">Premium Equestrian Equipment & Supplies</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Categories */}
          <aside className={`lg:w-64 flex-shrink-0 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h2 className="text-lg font-semibold">Categories</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <h2 className="text-lg font-semibold mb-4 hidden lg:block">Categories</h2>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      selectedCategory === category
                        ? "bg-indigo-600 text-white font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category === "all" ? "All Products" : category}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Category Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mb-4 w-full bg-white border rounded-lg px-4 py-2 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium">Filter by Category</span>
              <span className="text-sm text-gray-500">
                {selectedCategory === "all" ? "All Products" : selectedCategory}
              </span>
            </button>

            {/* Sale Products Section */}
            {filteredProducts.saleProducts.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">On Sale</h2>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {filteredProducts.saleProducts.length} items
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {filteredProducts.saleProducts.length > 0 ? "All Products" : "Products"}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <p className="text-gray-600 text-lg mb-4">No products found</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="text-indigo-600 hover:text-indigo-700 underline"
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={cancelAddToCart}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Add to Cart?</h2>
            <div className="flex items-center gap-4 mb-6">
              {confirmProduct.image ? (
                <img
                  src={confirmProduct.image}
                  alt={confirmProduct.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                  No image
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{confirmProduct.name}</h3>
                {confirmProduct.category && (
                  <p className="text-sm text-gray-500">{confirmProduct.category}</p>
                )}
                {confirmProduct.description && (
                  <p className="text-sm text-gray-600 mt-2">{confirmProduct.description}</p>
                )}
                <div className="mt-1">
                  {confirmProduct.sale && confirmProduct.sale_proce > 0 ? (
                    <>
                      <span className="text-lg font-bold text-red-600">
                        ${confirmProduct.sale_proce.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-400 line-through ml-2">
                        ${confirmProduct.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      ${confirmProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelAddToCart}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddToCart}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:opacity-90 transition"
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </main>
  );
}

// Product Card Component
function ProductCard({ product, onAddToCart }) {
  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      <div className="relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-xs">
            No image
          </div>
        )}
        {product.sale && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
            SALE
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        {product.category && (
          <p className="text-xs text-gray-500 mb-2">{product.category}</p>
        )}
        <div className="flex items-center gap-2 mb-3">
          {product.sale && product.sale_proce > 0 ? (
            <>
              <span className="text-base font-bold text-red-600">
                ${product.sale_proce.toFixed(2)}
              </span>
              <span className="text-xs text-gray-400 line-through">
                ${product.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-base font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>
        <button
          onClick={() => onAddToCart(product)}
          className="mt-auto w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
