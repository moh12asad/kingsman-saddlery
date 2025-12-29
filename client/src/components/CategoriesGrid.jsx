import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTranslated } from "../utils/translations";
import { auth } from "../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CategoriesGrid() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    async function loadData() {
      try {
        // Get current language for translation
        const lang = i18n.language || 'en';
        
        // Load categories with all languages to get translation objects
        // We need the English names to compare with products
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        const categoriesRes = await fetch(`${API}/api/categories?all=true`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }

        // Load products to check which categories have products
        const productsRes = await fetch(`${API}/api/products?lang=${lang}`);
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
  }, [i18n.language]);

  const handleCategoryClick = (category) => {
    const categoryName = getTranslated(category.name, i18n.language || 'en');
    const categoryNameEn = getTranslated(category.name, 'en');
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    const hasProducts = products.some(p => {
      // Products store category as English string, so compare with English category name
      const productCategory = typeof p.category === 'string' ? p.category : getTranslated(p.category, 'en');
      return productCategory === categoryNameEn && p.available;
    });
    
    if (hasSubCategories) {
      // Navigate to subcategories page
      navigate(`/subcategories/${encodeURIComponent(categoryName)}`);
    } else if (hasProducts) {
      // Navigate directly to products page with category filter
      navigate(`/products?category=${encodeURIComponent(categoryName)}`);
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
          const categoryName = getTranslated(category.name, i18n.language || 'en');
          const categoryNameEn = getTranslated(category.name, 'en');
          
          // Filter out categories with empty names (missing translations)
          if (!categoryNameEn || categoryNameEn.trim() === '') {
            return null;
          }
          
          const hasProducts = products.some(p => {
            // Products store category as English string, so compare with English category name
            const productCategory = typeof p.category === 'string' ? p.category : getTranslated(p.category, 'en');
            return productCategory === categoryNameEn && p.available;
          });
          const hasSubCategories = category.subCategories && category.subCategories.length > 0;
          
          // Only show categories that have products or subcategories
          if (!hasProducts && !hasSubCategories) {
            return null;
          }

          return (
            <div
              key={category.id || categoryName}
              onClick={() => handleCategoryClick(category)}
              className="relative group cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="aspect-square relative">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={categoryName}
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
                      {categoryName}
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


