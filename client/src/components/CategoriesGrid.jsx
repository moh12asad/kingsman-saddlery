import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CategoriesGrid() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        // Load categories
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        const categoriesRes = await fetch(`${API}/api/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }

        // Load products to check which categories have products
        const productsRes = await fetch(`${API}/api/products`);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const availableProducts = (productsData.products || []).filter(
            (product) => product.available === true
          );
          setProducts(availableProducts);
        }
      } catch (err) {
        console.error("Failed to load categories or products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCategoryClick = (category) => {
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    const hasProducts = products.some(p => p.category === category.name && p.available);
    
    if (hasSubCategories) {
      // Navigate to subcategories page
      navigate(`/subcategories/${encodeURIComponent(category.name)}`);
    } else if (hasProducts) {
      // Navigate directly to products page with category filter
      navigate(`/products?category=${encodeURIComponent(category.name)}`);
    }
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-500">Loading categories...</p>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ gap: '1rem' }}>
        {categories.map((category) => {
          const hasProducts = products.some(p => p.category === category.name && p.available);
          const hasSubCategories = category.subCategories && category.subCategories.length > 0;
          
          // Only show categories that have products or subcategories
          if (!hasProducts && !hasSubCategories) {
            return null;
          }

          return (
            <div
              key={category.id || category.name}
              onClick={() => handleCategoryClick(category)}
              className="relative group cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="aspect-square relative">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--brand), var(--brand-dark))' }}>
                    <span className="text-white text-4xl">📦</span>
                  </div>
                )}
                {/* Overlay with category name - bottom center */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
                  <div className="w-full p-4 flex items-center justify-center">
                    <h3 className="category-card-title text-white font-bold text-lg md:text-xl text-center px-4 py-2">
                      {category.name}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


