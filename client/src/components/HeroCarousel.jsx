import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Hero slides configuration
// You can replace these placeholder images with your actual hero images
const heroSlides = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&h=800&fit=crop",
    title: "Elevate Every Ride",
    subtitle: "Add luxury style, performance and comfort to every ride with premium equestrian equipment.",
    button1: "Shop Saddles",
    button2: "Shop Equipment"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1516726817505-2a5bc90e8d03?w=1920&h=800&fit=crop",
    title: "Premium Quality",
    subtitle: "Discover our collection of handcrafted saddles and equestrian gear.",
    button1: "View Collection",
    button2: "Learn More"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=800&fit=crop",
    title: "Expert Craftsmanship",
    subtitle: "Built for comfort, durability, and performance in the arena and on the trail.",
    button1: "Shop Now",
    button2: "Browse Products"
  }
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-rotate slides every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

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
                  <h1 className="hero-title">{slide.title}</h1>
                  <p className="hero-subtitle">{slide.subtitle}</p>
                  <div className="hero-buttons">
                    <button className="btn-hero btn-hero-primary">
                      {slide.button1}
                    </button>
                    <button className="btn-hero btn-hero-secondary">
                      {slide.button2}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        className="hero-nav hero-nav-prev"
        onClick={goToPrevious}
        aria-label="Previous slide"
      >
        <FaChevronLeft />
      </button>
      <button
        className="hero-nav hero-nav-next"
        onClick={goToNext}
        aria-label="Next slide"
      >
        <FaChevronRight />
      </button>

      {/* Slide Indicators */}
      <div className="hero-indicators">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            className={`hero-indicator ${index === currentSlide ? "active" : ""}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}


