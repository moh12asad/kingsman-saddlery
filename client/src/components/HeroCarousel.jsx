import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function HeroCarousel() {
  const [heroSlides, setHeroSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Fetch hero slides from API
  useEffect(() => {
    async function loadSlides() {
      try {
        const res = await fetch(`${API}/api/hero-slides`);
        const data = await res.json();
        const slides = data.slides || [];
        // Sort by order if available
        setHeroSlides(slides.sort((a, b) => (a.order || 0) - (b.order || 0)));
      } catch (error) {
        console.error("Failed to load hero slides:", error);
        // Fallback to empty array if API fails
        setHeroSlides([]);
      } finally {
        setLoading(false);
      }
    }
    loadSlides();
  }, []);

  // Auto-rotate slides every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying || heroSlides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, heroSlides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  // Don't render if loading or no slides
  if (loading) {
    return (
      <div className="hero-carousel">
        <div className="hero-carousel-container">
          <div className="hero-slide active" style={{ background: "#1a1a1a" }}>
            <div className="hero-slide-overlay">
              <div className="container-main">
                <div className="hero-content">
                  <p className="text-white">{t("shop.hero.loading")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (heroSlides.length === 0) {
    return null; // Don't render carousel if no slides
  }

  return (
    <div className="hero-carousel">
      <div className="hero-carousel-container">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`hero-slide ${index === currentSlide ? "active" : ""}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="hero-slide-overlay">
              <div className="container-main">
                <div className="hero-content">
                  {slide.title && <h1 className="hero-title">{slide.title}</h1>}
                  {slide.subtitle && <p className="hero-subtitle">{slide.subtitle}</p>}
                  {(slide.button1 || slide.button2) && (
                    <div className="hero-buttons">
                      {slide.button1 && (
                        <button className="btn-hero btn-hero-primary">
                          {slide.button1}
                        </button>
                      )}
                      {slide.button2 && (
                        <button className="btn-hero btn-hero-secondary">
                          {slide.button2}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - only show if more than one slide */}
      {heroSlides.length > 1 && (
        <>
          <button
            className="hero-nav hero-nav-prev"
            onClick={goToPrevious}
            aria-label={t("shop.hero.previousSlide")}
          >
            <FaChevronLeft />
          </button>
          <button
            className="hero-nav hero-nav-next"
            onClick={goToNext}
            aria-label={t("shop.hero.nextSlide")}
          >
            <FaChevronRight />
          </button>
        </>
      )}

      {/* Slide Indicators - only show if more than one slide */}
      {heroSlides.length > 1 && (
        <div className="hero-indicators">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`hero-indicator ${index === currentSlide ? "active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`${t("shop.hero.goToSlide")} ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


