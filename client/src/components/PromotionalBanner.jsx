import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function PromotionalBanner() {
  const [ads, setAds] = useState([]);
  const [currentAd, setCurrentAd] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch ads from API
  useEffect(() => {
    async function loadAds() {
      try {
        const res = await fetch(`${API}/api/ads`);
        const data = await res.json();
        const fetchedAds = data.ads || [];
        // Sort by order if available
        setAds(fetchedAds.sort((a, b) => (a.order || 0) - (b.order || 0)));
      } catch (error) {
        console.error("Failed to load ads:", error);
        setAds([]);
      } finally {
        setLoading(false);
      }
    }
    loadAds();
  }, []);

  // Auto-rotate ads every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying || ads.length === 0) return;

    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, ads.length]);

  const goToAd = (index) => {
    setCurrentAd(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentAd((prev) => (prev - 1 + ads.length) % ads.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentAd((prev) => (prev + 1) % ads.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  // Don't render if loading or no ads
  if (loading) {
    return null;
  }

  if (ads.length === 0) {
    return null; // Don't render banner if no ads
  }

  return (
    <div className="promotional-banner">
      <div className="promotional-banner-container">
        {ads.map((ad, index) => {
          const isActive = index === currentAd;
          
          return (
            <div
              key={ad.id}
              className={`promotional-banner-slide ${isActive ? "active" : ""}`}
            >
              {ad.image && (
                <div 
                  className="promotional-banner-image"
                  style={{ backgroundImage: `url(${ad.image})` }}
                />
              )}
              <div className="promotional-banner-overlay"></div>
              <div className="promotional-banner-content">
                {ad.title && <h2 className="promotional-banner-title">{ad.title}</h2>}
                {ad.subtitle && <p className="promotional-banner-subtitle">{ad.subtitle}</p>}
                {ad.link && (
                  <a 
                    href={ad.link} 
                    className="promotional-banner-link"
                  >
                    Learn More
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows - only show if more than one ad */}
      {ads.length > 1 && (
        <>
          <button
            className="promotional-banner-nav promotional-banner-nav-prev"
            onClick={goToPrevious}
            aria-label="Previous ad"
          >
            <FaChevronLeft />
          </button>
          <button
            className="promotional-banner-nav promotional-banner-nav-next"
            onClick={goToNext}
            aria-label="Next ad"
          >
            <FaChevronRight />
          </button>
        </>
      )}

      {/* Slide Indicators - only show if more than one ad */}
      {ads.length > 1 && (
        <div className="promotional-banner-indicators">
          {ads.map((_, index) => (
            <button
              key={index}
              className={`promotional-banner-indicator ${index === currentAd ? "active" : ""}`}
              onClick={() => goToAd(index)}
              aria-label={`Go to ad ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}




