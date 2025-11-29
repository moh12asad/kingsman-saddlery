import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SubCategories() {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        // Decode category name
        const decodedCategoryName = decodeURIComponent(categoryName || "");

        // Load categories
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        const categoriesRes = await fetch(`${API}/api/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!categoriesRes.ok) {
          throw new Error("Failed to fetch categories");
        }

        const categoriesData = await categoriesRes.json();
        const foundCategory = (categoriesData.categories || []).find(
          (cat) => cat.name === decodedCategoryName
        );

        if (!foundCategory) {
          throw new Error("Category not found");
        }

        setCategory(foundCategory);

        // Load products to check which subcategories have products
        const productsRes = await fetch(`${API}/api/products`);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const availableProducts = (productsData.products || []).filter(
            (product) => product.available === true
          );
          setProducts(availableProducts);
        }
      } catch (err) {
        setError(err.message || "Failed to load category");
        console.error("Error loading category:", err);
      } finally {
        setLoading(false);
      }
    }

    if (categoryName) {
      loadData();
    }
  }, [categoryName]);

  const handleSubCategoryClick = (subCategoryName) => {
    navigate(`/products?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subCategoryName)}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="margin-top-md text-muted">Loading subcategories...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !category) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-error heading-3">{error || "Category not found"}</p>
            <button
              onClick={() => navigate("/")}
              className="btn-primary margin-top-md"
            >
              Go to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const subCategories = category.subCategories || [];

  if (subCategories.length === 0) {
    // If no subcategories, redirect to products page with category filter
    navigate(`/products?category=${encodeURIComponent(category.name)}`);
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600 text-lg">{category.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {subCategories.map((subCategory, index) => {
            const hasProducts = products.some(
              (p) => p.category === category.name && p.subCategory === subCategory.name && p.available
            );

            // Only show subcategories that have products
            if (!hasProducts) {
              return null;
            }

            return (
              <div
                key={index}
                onClick={() => handleSubCategoryClick(subCategory.name)}
                className="relative group cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="aspect-square relative">
                  {subCategory.image ? (
                    <img
                      src={subCategory.image}
                      alt={subCategory.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-4xl">📦</span>
                    </div>
                  )}
                  {/* Overlay with subcategory name */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
                    <div className="w-full p-4">
                      <h3 className="text-white font-bold text-lg md:text-xl text-center">
                        {subCategory.name}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {subCategories.filter((sub) => 
          products.some(p => p.category === category.name && p.subCategory === sub.name && p.available)
        ).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No subcategories with products available</p>
            <button
              onClick={() => navigate("/")}
              className="btn-primary"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </main>
  );
}


