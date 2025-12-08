import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { useLanguage } from "../context/LanguageContext";
import { useTranslatedContent } from "../hooks/useTranslatedContent";
import { getTranslatedContent } from "../utils/getTranslatedContent";

const API = import.meta.env.VITE_API_BASE_URL || "";

// Helper component for category card
function CategoryCard({ category, categoryName, onClick }) {
  return (
    <div
      onClick={onClick}
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
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-4xl">📦</span>
          </div>
        )}
        {/* Overlay with category name */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
          <div className="w-full p-4">
            <h3 className="text-white font-bold text-lg md:text-xl text-center">
              {categoryName}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesGrid() {
  const { t } = useLanguage();
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

  const { language } = useLanguage();
  
  const handleCategoryClick = (category) => {
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    const categoryName = getTranslatedContent(category.name, language);
    // For matching, use English names to ensure compatibility with old string format products
    const categoryNameEn = getTranslatedContent(category.name, 'en');
    const hasProducts = products.some(p => {
      // Get English name for comparison (products may still have old string format)
      const pCategoryEn = getTranslatedContent(p.category, 'en');
      return pCategoryEn === categoryNameEn && p.available;
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
          <p className="text-gray-500">{t("shop.loadingCategories")}</p>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-8">{t("shop.shopByCategory")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category) => {
          const categoryName = getTranslatedContent(category.name, language);
          // For matching, use English names to ensure compatibility with old string format products
          const categoryNameEn = getTranslatedContent(category.name, 'en');
          const hasProducts = products.some(p => {
            // Get English name for comparison (products may still have old string format)
            const pCategoryEn = getTranslatedContent(p.category, 'en');
            return pCategoryEn === categoryNameEn && p.available;
          });
          const hasSubCategories = category.subCategories && category.subCategories.length > 0;
          
          // Only show categories that have products or subcategories
          if (!hasProducts && !hasSubCategories) {
            return null;
          }

          return (
            <CategoryCard 
              key={category.id || categoryName}
              category={category}
              categoryName={categoryName}
              onClick={() => handleCategoryClick(category)}
            />
          );
        })}
      </div>
    </section>
  );
}


