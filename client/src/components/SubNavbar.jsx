import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTranslated } from "../utils/translations";
import { auth } from "../lib/firebase";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SubNavbar() {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [navbarHeight, setNavbarHeight] = useState(96); // Default 6rem
  const [isMobile, setIsMobile] = useState(false);
  const itemRefs = useRef({});
  const hoverTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate navbar height dynamically
  useEffect(() => {
    const updateNavbarHeight = () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        const height = navbar.offsetHeight;
        setNavbarHeight(height);
      }
    };

    // Initial calculation
    updateNavbarHeight();

    // Use requestAnimationFrame for better timing
    const rafId = requestAnimationFrame(() => {
      updateNavbarHeight();
    });

    // Update after DOM is fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateNavbarHeight);
    } else {
      // DOM is already loaded, update immediately
      updateNavbarHeight();
    }

    // Update after images load (navbar might contain images)
    window.addEventListener('load', updateNavbarHeight);

    // Update on resize
    window.addEventListener('resize', updateNavbarHeight);

    // Use ResizeObserver to watch for navbar size changes
    const navbar = document.querySelector('.navbar');
    let resizeObserver = null;
    if (navbar && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateNavbarHeight();
      });
      resizeObserver.observe(navbar);
    }

    // Also update after multiple delays to account for any dynamic content
    const timeouts = [
      setTimeout(updateNavbarHeight, 100),
      setTimeout(updateNavbarHeight, 300),
      setTimeout(updateNavbarHeight, 500),
    ];

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateNavbarHeight);
      window.removeEventListener('load', updateNavbarHeight);
      document.removeEventListener('DOMContentLoaded', updateNavbarHeight);
      if (resizeObserver && navbar) {
        resizeObserver.unobserve(navbar);
        resizeObserver.disconnect();
      }
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        // Load categories with all languages to get translation objects
        // We need the English names to compare with products
        const lang = i18n.language || 'en';
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

  // Update dropdown position on scroll and resize
  useEffect(() => {
    if (!hoveredCategory) return;

    const updatePosition = () => {
      const element = itemRefs.current[hoveredCategory];
      if (element) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Calculate optimal position
        let top = rect.bottom;
        let left = rect.left;
        let width = Math.max(300, rect.width);
        
        // Adjust if dropdown would go off bottom of screen
        // Estimate dropdown height (we'll use a reasonable max)
        const estimatedDropdownHeight = 400; // Approximate max height
        if (top + estimatedDropdownHeight > viewportHeight) {
          // Position above instead if there's more space above
          const spaceAbove = rect.top;
          const spaceBelow = viewportHeight - rect.bottom;
          if (spaceAbove > spaceBelow && spaceAbove > estimatedDropdownHeight) {
            top = rect.top - estimatedDropdownHeight;
          } else {
            // Adjust to fit within viewport
            top = Math.max(10, viewportHeight - estimatedDropdownHeight - 10);
          }
        }
        
        // Adjust if dropdown would go off right side of screen
        if (left + width > viewportWidth) {
          left = Math.max(10, viewportWidth - width - 10);
        }
        
        // Adjust if dropdown would go off left side of screen
        if (left < 0) {
          left = 10;
        }
        
        setDropdownPosition({
          top: Math.max(10, top),
          left: Math.max(10, left),
          width: width
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

  // Close dropdown on mobile when clicking outside
  useEffect(() => {
    if (!isMobile || !hoveredCategory) return;

    function handleClickOutside(event) {
      // Check if click is outside the category item and dropdown
      const clickedCategoryItem = event.target.closest('.subnavbar-item');
      const clickedDropdown = event.target.closest('.subnavbar-dropdown');
      
      if (!clickedCategoryItem && !clickedDropdown) {
        setHoveredCategory(null);
      }
    }

    // Small delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile, hoveredCategory]);

  // Helper function to check if a product belongs to a category
  // Handles multiple category formats: category (string), categories (array), categoryPairs (array of objects)
  const productBelongsToCategory = (product, categoryNameEn) => {
    if (!product.available) return false;
    
    // Check categoryPairs first (new format)
    if (Array.isArray(product.categoryPairs) && product.categoryPairs.length > 0) {
      return product.categoryPairs.some(pair => {
        const pairCategory = typeof pair.category === 'string' 
          ? pair.category 
          : getTranslated(pair.category, 'en');
        return pairCategory === categoryNameEn;
      });
    }
    
    // Check categories array
    if (Array.isArray(product.categories) && product.categories.length > 0) {
      return product.categories.some(cat => {
        const catName = typeof cat === 'string' ? cat : getTranslated(cat, 'en');
        return catName === categoryNameEn;
      });
    }
    
    // Check single category field (backward compatibility)
    if (product.category) {
      const pCategory = typeof product.category === 'string' 
        ? product.category 
        : getTranslated(product.category, 'en');
      return pCategory === categoryNameEn;
    }
    
    return false;
  };

  const handleCategoryClick = (category, event) => {
    const categoryName = getTranslated(category.name, i18n.language || 'en');
    const categoryNameEn = getTranslated(category.name, 'en');
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    const hasProducts = products.some(p => productBelongsToCategory(p, categoryNameEn));
    
    const categoryKey = category.id || categoryName;
    const subCategories = category.subCategories || [];
    const visibleSubCategories = subCategories.filter((subCat) => {
      const subCatName = getTranslated(subCat.name, i18n.language || 'en');
      return subCatName && subCatName.trim() !== '';
    });
    
    // On mobile, if category has subcategories, toggle dropdown instead of navigating
    if (isMobile && hasSubCategories && visibleSubCategories.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      
      // Toggle dropdown
      if (hoveredCategory === categoryKey) {
        setHoveredCategory(null);
      } else {
        // Calculate dropdown position
        const element = itemRefs.current[categoryKey];
        if (element) {
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          
          let top = rect.bottom;
          let left = rect.left;
          let width = Math.max(300, rect.width);
          
          const estimatedDropdownHeight = 400;
          if (top + estimatedDropdownHeight > viewportHeight) {
            const spaceAbove = rect.top;
            const spaceBelow = viewportHeight - rect.bottom;
            if (spaceAbove > spaceBelow && spaceAbove > estimatedDropdownHeight) {
              top = rect.top - estimatedDropdownHeight;
            } else {
              top = Math.max(10, viewportHeight - estimatedDropdownHeight - 10);
            }
          }
          
          if (left + width > viewportWidth) {
            left = Math.max(10, viewportWidth - width - 10);
          }
          
          if (left < 0) {
            left = 10;
          }
          
          setDropdownPosition({
            top: Math.max(10, top),
            left: Math.max(10, left),
            width: width
          });
        }
        setHoveredCategory(categoryKey);
      }
    } else {
      // Desktop behavior or category without subcategories
      if (hasSubCategories) {
        // Navigate to subcategories page
        navigate(`/subcategories/${encodeURIComponent(categoryName)}`);
      } else if (hasProducts) {
        // Navigate directly to products page with category filter
        navigate(`/products?category=${encodeURIComponent(categoryName)}`);
      }
    }
  };

  const handleSubCategoryClick = (category, subCategory) => {
    const categoryName = getTranslated(category.name, i18n.language || 'en');
    const subCategoryName = getTranslated(subCategory.name, i18n.language || 'en');
    // Products page accepts category/subcategory names in any language and converts to English for filtering
    navigate(`/products?category=${encodeURIComponent(categoryName)}&subcategory=${encodeURIComponent(subCategoryName)}`);
  };

  if (loading) {
    return null;
  }

  // Filter categories that have products or subcategories
  // Compare using English names since products store category as English strings
  const visibleCategories = categories.filter((category) => {
    const categoryNameEn = getTranslated(category.name, 'en');
    const categoryName = getTranslated(category.name, i18n.language || 'en');
    
    // Filter out categories with empty names (missing translations)
    if (!categoryNameEn || categoryNameEn.trim() === '') {
      return false;
    }
    
    const hasProducts = products.some(p => productBelongsToCategory(p, categoryNameEn));
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
        const subCatName = getTranslated(subCat.name, i18n.language || 'en');
        // Only filter out subcategories with empty names (missing translations)
        return subCatName && subCatName.trim() !== '';
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
              const categoryName = getTranslated(category.name, i18n.language || 'en');
              const categoryNameEn = getTranslated(category.name, 'en');
              // Show all subcategories that have a valid translated name, regardless of whether they have products
              const visibleSubCategories = subCategories.filter((subCat) => {
                const subCatName = getTranslated(subCat.name, i18n.language || 'en');
                // Only filter out subcategories with empty names (missing translations)
                return subCatName && subCatName.trim() !== '';
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
                      const viewportHeight = window.innerHeight;
                      const viewportWidth = window.innerWidth;
                      
                      // Calculate optimal position
                      let top = rect.bottom;
                      let left = rect.left;
                      let width = Math.max(300, rect.width);
                      
                      // Adjust if dropdown would go off bottom of screen
                      const estimatedDropdownHeight = 400;
                      if (top + estimatedDropdownHeight > viewportHeight) {
                        const spaceAbove = rect.top;
                        const spaceBelow = viewportHeight - rect.bottom;
                        if (spaceAbove > spaceBelow && spaceAbove > estimatedDropdownHeight) {
                          top = rect.top - estimatedDropdownHeight;
                        } else {
                          top = Math.max(10, viewportHeight - estimatedDropdownHeight - 10);
                        }
                      }
                      
                      // Adjust if dropdown would go off right side
                      if (left + width > viewportWidth) {
                        left = Math.max(10, viewportWidth - width - 10);
                      }
                      
                      // Adjust if dropdown would go off left side
                      if (left < 0) {
                        left = 10;
                      }
                      
                      setDropdownPosition({
                        top: Math.max(10, top),
                        left: Math.max(10, left),
                        width: width
                      });
                    }
                    // Show dropdown if category has subcategories
                    if (hasSubCategories && visibleSubCategories.length > 0) {
                      setHoveredCategory(categoryKey);
                    } else {
                      // Clear hovered category if this category has no subcategories
                      setHoveredCategory(null);
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
                    onClick={(e) => handleCategoryClick(category, e)}
                    className="subnavbar-link"
                  >
                    {getTranslated(category.name, i18n.language || 'en')}
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
            minWidth: `${Math.max(300, dropdownPosition.width)}px`,
            maxWidth: typeof window !== 'undefined' ? `${Math.min(600, window.innerWidth - dropdownPosition.left - 20)}px` : '600px'
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
                {hoveredSubCategories.map((subCategory, index) => (
                  <li key={index} className="subnavbar-dropdown-item">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSubCategoryClick(hoveredCategoryData, subCategory);
                        setHoveredCategory(null);
                      }}
                      className="subnavbar-dropdown-link"
                      type="button"
                    >
                      {getTranslated(subCategory.name, i18n.language || 'en')}
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

