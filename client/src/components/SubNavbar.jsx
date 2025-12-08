import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SubNavbar() {
  const { language } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [navbarHeight, setNavbarHeight] = useState(96); // Default 6rem
  const itemRefs = useRef({});
  const hoverTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Calculate navbar height dynamically
  useEffect(() => {
    const updateNavbarHeight = () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        setNavbarHeight(navbar.offsetHeight);
      }
    };

    updateNavbarHeight();
    window.addEventListener('resize', updateNavbarHeight);
    
    // Also update after a short delay to account for any dynamic content
    const timeout = setTimeout(updateNavbarHeight, 100);

    return () => {
      window.removeEventListener('resize', updateNavbarHeight);
      clearTimeout(timeout);
    };
  }, []);

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

  // Update dropdown position on scroll and resize
  useEffect(() => {
    if (!hoveredCategory) return;

    const updatePosition = () => {
      const element = itemRefs.current[hoveredCategory];
      if (element) {
        const rect = element.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };

    // Update position immediately
    updatePosition();

    // Update on scroll and resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [hoveredCategory]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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

  const handleSubCategoryClick = (category, subCategory) => {
    const categoryName = getTranslatedContent(category.name, language);
    const subCategoryName = getTranslatedContent(subCategory.name, language);
    navigate(`/products?category=${encodeURIComponent(categoryName)}&subcategory=${encodeURIComponent(subCategoryName)}`);
  };

  if (loading) {
    return null;
  }

  // Filter categories that have products or subcategories
  const visibleCategories = categories.filter((category) => {
    // For matching, use English names to ensure compatibility with old string format products
    const categoryNameEn = getTranslatedContent(category.name, 'en');
    const hasProducts = products.some(p => {
      // Get English name for comparison (products may still have old string format)
      const pCategoryEn = getTranslatedContent(p.category, 'en');
      return pCategoryEn === categoryNameEn && p.available;
    });
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    return hasProducts || hasSubCategories;
  });

  if (visibleCategories.length === 0) {
    return null;
  }

  // Find the hovered category data
  const hoveredCategoryData = visibleCategories.find(
    (cat) => {
      const catName = getTranslatedContent(cat.name, language);
      return (cat.id || catName) === hoveredCategory;
    }
  );
  const hoveredSubCategories = hoveredCategoryData
    ? (hoveredCategoryData.subCategories || []).filter((subCat) => {
        // For matching, use English names to ensure compatibility with old string format products
        const catNameEn = getTranslatedContent(hoveredCategoryData.name, 'en');
        const subCatNameEn = getTranslatedContent(subCat.name, 'en');
        return products.some(p => {
          // Get English names for comparison (products may still have old string format)
          const pCategoryEn = getTranslatedContent(p.category, 'en');
          const pSubCategoryEn = getTranslatedContent(p.subCategory, 'en');
          return pCategoryEn === catNameEn && pSubCategoryEn === subCatNameEn && p.available;
        });
      })
    : [];

  return (
    <>
      <nav className="subnavbar" style={{ top: `${navbarHeight}px` }}>
        <div className="subnavbar-content">
          <ul className="subnavbar-list">
            {visibleCategories.map((category) => {
              const categoryName = getTranslatedContent(category.name, language);
              const hasSubCategories = category.subCategories && category.subCategories.length > 0;
              const subCategories = category.subCategories || [];
              // For matching, use English names to ensure compatibility with old string format products
              const categoryNameEn = getTranslatedContent(category.name, 'en');
              const visibleSubCategories = subCategories.filter((subCat) => {
                const subCatNameEn = getTranslatedContent(subCat.name, 'en');
                return products.some(p => {
                  // Get English names for comparison (products may still have old string format)
                  const pCategoryEn = getTranslatedContent(p.category, 'en');
                  const pSubCategoryEn = getTranslatedContent(p.subCategory, 'en');
                  return pCategoryEn === categoryNameEn && pSubCategoryEn === subCatNameEn && p.available;
                });
              });

              const categoryKey = category.id || categoryName;
              const isHovered = hoveredCategory === categoryKey;

              return (
                <li
                  key={categoryKey}
                  className="subnavbar-item"
                  ref={(el) => {
                    if (el) itemRefs.current[categoryKey] = el;
                  }}
                  onMouseEnter={() => {
                    // Clear any pending close timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    
                    const element = itemRefs.current[categoryKey];
                    if (element) {
                      const rect = element.getBoundingClientRect();
                      setDropdownPosition({
                        top: rect.bottom,
                        left: rect.left,
                        width: rect.width
                      });
                    }
                    // Show dropdown if category has subcategories
                    if (hasSubCategories && visibleSubCategories.length > 0) {
                      setHoveredCategory(categoryKey);
                    }
                  }}
                  onMouseLeave={() => {
                    // Add a small delay before closing to make it easier to catch
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredCategory(null);
                    }, 150);
                  }}
                >
                  <button
                    onClick={() => handleCategoryClick(category)}
                    className="subnavbar-link"
                  >
                    {categoryName}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      {hoveredCategory && hoveredCategoryData && hoveredSubCategories.length > 0 && createPortal(
        <div 
          className="subnavbar-dropdown subnavbar-dropdown-fixed"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: `${Math.max(300, dropdownPosition.width)}px`
          }}
          onMouseEnter={() => {
            // Clear any pending close timeout
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setHoveredCategory(hoveredCategory);
          }}
          onMouseLeave={() => {
            // Add a small delay before closing to make it easier to catch
            hoverTimeoutRef.current = setTimeout(() => {
              setHoveredCategory(null);
            }, 150);
          }}
        >
          <div className="subnavbar-dropdown-content">
            {hoveredSubCategories.length > 0 && (
              <ul className="subnavbar-dropdown-list">
                {hoveredSubCategories.map((subCategory, index) => {
                  const subCategoryName = getTranslatedContent(subCategory.name, language);
                  return (
                    <li key={index} className="subnavbar-dropdown-item">
                      <button
                        onClick={() => handleSubCategoryClick(hoveredCategoryData, subCategory)}
                        className="subnavbar-dropdown-link"
                      >
                        {subCategoryName}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

