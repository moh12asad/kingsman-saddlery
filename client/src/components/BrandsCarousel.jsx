import { useState, useEffect, useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function BrandsCarousel() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);

  useEffect(() => {
    async function loadBrands() {
      try {
        const response = await fetch(`${API}/api/brands`);
        if (!response.ok) {
          throw new Error("Failed to fetch brands");
        }
        const data = await response.json();
        setBrands(data.brands || []);
      } catch (err) {
        console.error("Failed to load brands:", err);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    }

    loadBrands();
  }, []);

  // Center the carousel on load and setup auto-scroll
  useEffect(() => {
    if (scrollRef.current && brands.length > 0) {
      // Wait for DOM to render
      setTimeout(() => {
        if (scrollRef.current) {
          // Start from the middle set of brands (second set)
          const cardWidth = 180; // brand card width
          const gap = 32; // gap between cards (2rem = 32px)
          const singleSetWidth = brands.length * (cardWidth + gap);
          // Scroll to start of second set
          scrollRef.current.scrollLeft = singleSetWidth;
        }
      }, 100);
    }
  }, [brands]);

  // Auto-scroll functionality
  useEffect(() => {
    if (!scrollRef.current || brands.length === 0 || isPaused) {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      return;
    }

    // Start auto-scroll
    autoScrollIntervalRef.current = setInterval(() => {
      if (scrollRef.current && !isPaused) {
        const cardWidth = 180;
        const gap = 32;
        const singleSetWidth = brands.length * (cardWidth + gap);
        const currentScroll = scrollRef.current.scrollLeft;
        
        // Scroll to the right
        scrollRef.current.scrollLeft += 1;
        
        // When we've scrolled past the second set, reset to the start of the second set
        // This creates a seamless infinite loop
        if (currentScroll >= singleSetWidth * 2 - 10) {
          scrollRef.current.scrollLeft = singleSetWidth;
        }
      }
    }, 30); // Scroll every 30ms for smooth movement

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [brands, isPaused]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      // Temporarily pause auto-scroll when using arrows
      setIsPaused(true);
      
      const cardWidth = 180;
      const gap = 32;
      const scrollAmount = cardWidth + gap;
      
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      
      // Resume auto-scroll after a delay
      setTimeout(() => {
        setIsPaused(false);
      }, 2000); // Resume after 2 seconds
    }
  };

  if (loading) {
    return (
      <section className="brands-carousel-section">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading brands...</p>
        </div>
      </section>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="brands-carousel-section">
      <div className="brands-carousel-container">
        <button
          className="brands-carousel-arrow brands-carousel-arrow-left"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scroll('left');
          }}
          aria-label="Scroll left"
          type="button"
        >
          <FaChevronLeft />
        </button>
        <button
          className="brands-carousel-arrow brands-carousel-arrow-right"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scroll('right');
          }}
          aria-label="Scroll right"
          type="button"
        >
          <FaChevronRight />
        </button>
        <div 
          className="brands-carousel" 
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Duplicate brands for seamless infinite scroll */}
          {[...brands, ...brands, ...brands].map((brand, index) => (
            <div key={`${brand.id}-${index}`} className="brand-card">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.name || "Brand"}
                  className="brand-logo"
                />
              ) : (
                <div className="brand-placeholder">
                  {brand.name || "Brand"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



