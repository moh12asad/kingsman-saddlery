import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SubNavbar() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [navbarHeight, setNavbarHeight] = useState(96); // Default 6rem
  const itemRefs = useRef({});
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

  const handleSubCategoryClick = (category, subCategory) => {
    navigate(`/products?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subCategory.name)}`);
  };

  if (loading) {
    return null;
  }

  // Filter categories that have products or subcategories
  const visibleCategories = categories.filter((category) => {
    const hasProducts = products.some(p => p.category === category.name && p.available);
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    return hasProducts || hasSubCategories;
  });

  if (visibleCategories.length === 0) {
    return null;
  }

  // Find the hovered category data
  const hoveredCategoryData = visibleCategories.find(
    (cat) => (cat.id || cat.name) === hoveredCategory
  );
  const hoveredSubCategories = hoveredCategoryData
    ? (hoveredCategoryData.subCategories || []).filter((subCat) => {
        return products.some(
          p => p.category === hoveredCategoryData.name && 
               p.subCategory === subCat.name && 
               p.available
        );
      })
    : [];

  return (
    <>
      <nav className="subnavbar" style={{ top: `${navbarHeight}px` }}>
        <div className="subnavbar-content">
          <ul className="subnavbar-list">
            {visibleCategories.map((category) => {
              const hasSubCategories = category.subCategories && category.subCategories.length > 0;
              const subCategories = category.subCategories || [];
              const visibleSubCategories = subCategories.filter((subCat) => {
                return products.some(
                  p => p.category === category.name && 
                       p.subCategory === subCat.name && 
                       p.available
                );
              });

              const categoryKey = category.id || category.name;
              const isHovered = hoveredCategory === categoryKey;

              return (
                <li
                  key={categoryKey}
                  className="subnavbar-item"
                  ref={(el) => {
                    if (el) itemRefs.current[categoryKey] = el;
                  }}
                  onMouseEnter={() => {
                    const element = itemRefs.current[categoryKey];
                    if (element) {
                      const rect = element.getBoundingClientRect();
                      setDropdownPosition({
                        top: rect.bottom,
                        left: rect.left,
                        width: rect.width
                      });
                    }
                    // Show dropdown if category has image or subcategories
                    if (category.image || (hasSubCategories && visibleSubCategories.length > 0)) {
                      setHoveredCategory(categoryKey);
                    }
                  }}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <button
                    onClick={() => handleCategoryClick(category)}
                    className="subnavbar-link"
                  >
                    {category.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      {hoveredCategory && hoveredCategoryData && (hoveredCategoryData.image || hoveredSubCategories.length > 0) && createPortal(
        <div 
          className="subnavbar-dropdown subnavbar-dropdown-fixed"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: `${Math.max(600, dropdownPosition.width)}px`
          }}
          onMouseEnter={() => setHoveredCategory(hoveredCategory)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <div className="subnavbar-dropdown-content">
            {hoveredCategoryData?.image && (
              <div className="subnavbar-dropdown-image">
                <img 
                  src={hoveredCategoryData.image} 
                  alt={hoveredCategoryData.name}
                  className="subnavbar-dropdown-img"
                />
              </div>
            )}
            {hoveredSubCategories.length > 0 && (
              <ul className="subnavbar-dropdown-list">
                {hoveredSubCategories.map((subCategory, index) => (
                  <li key={index} className="subnavbar-dropdown-item">
                    <button
                      onClick={() => handleSubCategoryClick(hoveredCategoryData, subCategory)}
                      className="subnavbar-dropdown-link"
                    >
                      {subCategory.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

