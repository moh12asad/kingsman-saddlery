import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getTranslated } from "../../utils/translations";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function ProductSelector({ 
  selectedProductIds = [], 
  onSelectionChange, 
  excludeProductId = null,
  label = "Related Products"
}) {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const lang = i18n.language || 'en';
      const response = await fetch(`${API}/api/products?lang=${lang}&all=true`);
      const data = await response.json();
      
      if (response.ok && data.products) {
        // Filter out the current product if excludeProductId is provided
        let filteredProducts = data.products;
        if (excludeProductId) {
          filteredProducts = data.products.filter(p => p.id !== excludeProductId);
        }
        setProducts(filteredProducts);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch(`${API}/api/categories?lang=${i18n.language || 'en'}`);
      const data = await response.json();
      if (response.ok && data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  // Filter products based on search term and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => {
        const name = getTranslated(product.name, i18n.language || 'en');
        const sku = product.sku || '';
        const brand = product.brand || '';
        return (
          name.toLowerCase().includes(searchLower) ||
          sku.toLowerCase().includes(searchLower) ||
          brand.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => {
        if (Array.isArray(product.categoryPairs) && product.categoryPairs.length > 0) {
          return product.categoryPairs.some(pair => pair.category === selectedCategory);
        }
        if (Array.isArray(product.categories)) {
          return product.categories.includes(selectedCategory);
        }
        return product.category === selectedCategory;
      });
    }

    // Exclude already selected products
    filtered = filtered.filter(product => !selectedProductIds.includes(product.id));

    return filtered;
  }, [products, searchTerm, selectedCategory, selectedProductIds, i18n.language]);

  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  const handleSelectProduct = (productId) => {
    if (!selectedProductIds.includes(productId)) {
      onSelectionChange([...selectedProductIds, productId]);
    }
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleRemoveProduct = (productId) => {
    onSelectionChange(selectedProductIds.filter(id => id !== productId));
  };

  return (
    <div className="space-y-3">
      <label className="form-label">{label}</label>
      
      {/* Selected Products Display */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Selected Products:</div>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map(product => {
              const productName = getTranslated(product.name, i18n.language || 'en');
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <span className="text-sm text-gray-700">{productName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(product.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-bold"
                    aria-label={`Remove ${productName}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            className="input w-full"
            placeholder="Search products by name, SKU, or brand..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {/* Dropdown Results */}
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute z-20 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto mt-2 w-full">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading products...</div>
                ) : filteredProducts.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {filteredProducts.map(product => {
                      const productName = getTranslated(product.name, i18n.language || 'en');
                      const productCategory = Array.isArray(product.categoryPairs) && product.categoryPairs.length > 0
                        ? product.categoryPairs[0].category
                        : (product.category || '');
                      
                      return (
                        <li
                          key={product.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSelectProduct(product.id)}
                        >
                          <div className="flex items-center gap-3">
                            {product.image && (
                              <img
                                src={product.image}
                                alt={productName}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{productName}</div>
                              <div className="text-sm text-gray-500">
                                {productCategory && <span>Category: {productCategory}</span>}
                                {product.sku && <span className="ml-2">SKU: {product.sku}</span>}
                                {product.brand && <span className="ml-2">Brand: {product.brand}</span>}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm || selectedCategory
                      ? "No products found matching your criteria"
                      : "No products available"}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Category Filter */}
        <select
          className="select w-full"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setShowDropdown(true);
          }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => {
            const catName = getTranslated(cat.name, i18n.language || 'en');
            return (
              <option key={cat.id} value={catName}>{catName}</option>
            );
          })}
        </select>
      </div>

      {selectedProducts.length === 0 && (
        <p className="text-sm text-gray-500">
          No related products selected. Use the search above to add related products.
        </p>
      )}
    </div>
  );
}

