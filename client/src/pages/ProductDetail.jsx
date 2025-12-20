import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCurrency } from "../context/CurrencyContext";
import FlyToCartAnimation from "../components/FlyToCartAnimation";
import { 
  FaHeart, 
  FaShoppingCart, 
  FaChevronLeft, 
  FaChevronRight, 
  FaSearchPlus,
  FaPlay,
  FaShare,
  FaFacebook,
  FaWhatsapp,
  FaQuestionCircle,
  FaShieldAlt,
  FaTruck,
  FaCertificate,
  FaChevronDown,
  FaChevronUp
} from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [animationTrigger, setAnimationTrigger] = useState(null);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    loadProduct();
    loadSettings();
  }, [id]);

  async function loadSettings() {
    try {
      const response = await fetch(`${API}/api/settings`);
      const data = await response.json();
      if (response.ok && data.settings?.whatsappNumber) {
        setWhatsappNumber(data.settings.whatsappNumber);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API}/api/products`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch product");
      }

      const found = (data.products || []).find(p => p.id === id);
      if (!found) {
        setError("Product not found");
        return;
      }

      setProduct(found);
    } catch (err) {
      setError(err.message || "Failed to load product");
      console.error("Error loading product:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = (e) => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      
      // Trigger animation if button was clicked
      if (e && e.currentTarget) {
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const position = {
          x: buttonRect.left + buttonRect.width / 2 - 30,
          y: buttonRect.top + buttonRect.height / 2 - 30
        };
        setAnimationTrigger({
          productImage: product.image,
          startPosition: position
        });
      }
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/cart");
  };

  const handleQuantityChange = (delta) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const images = product?.additionalImages && product.additionalImages.length > 0
    ? [product.image, ...product.additionalImages].filter(Boolean)
    : product?.image ? [product.image] : [];

  const isFav = product ? isFavorite(product.id) : false;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container-main padding-y-xl">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="margin-top-md text-muted">Loading product...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container-main padding-y-xl">
          <div className="text-center">
            <p className="text-error heading-3">{error || "Product not found"}</p>
            <button
              onClick={() => navigate("/shop")}
              className="btn btn-primary margin-top-md"
            >
              Back to Shop
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="product-detail-page margin-top-2xl">
      <div className="container-main" >
        {/* Breadcrumbs */}
        <nav className="breadcrumbs margin-bottom-lg">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/shop" className="breadcrumb-link">Shop</Link>
          {product.category && (
            <>
              <span className="breadcrumb-separator">/</span>
              <Link 
                to={`/products?category=${encodeURIComponent(product.category)}`} 
                className="breadcrumb-link"
              >
                {product.category}
              </Link>
            </>
          )}
          {product.subCategory && (
            <>
              <span className="breadcrumb-separator">/</span>
              <Link 
                to={`/products?category=${encodeURIComponent(product.category)}&subcategory=${encodeURIComponent(product.subCategory)}`} 
                className="breadcrumb-link"
              >
                {product.subCategory}
              </Link>
            </>
          )}
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-text">{product.name}</span>
        </nav>

        <div className="product-detail-grid">
          {/* Left Column - Product Images */}
          <div className="product-detail-images">
            {images.length > 0 ? (
              <>
                <div className="product-main-image-wrapper">
                  <img
                    src={images[selectedImageIndex]}
                    alt={product.name}
                    className="product-main-image"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        className="product-image-nav product-image-nav-left"
                        onClick={() => setSelectedImageIndex(prev => 
                          prev > 0 ? prev - 1 : images.length - 1
                        )}
                        aria-label="Previous image"
                      >
                        <FaChevronLeft />
                      </button>
                      <button
                        className="product-image-nav product-image-nav-right"
                        onClick={() => setSelectedImageIndex(prev => 
                          prev < images.length - 1 ? prev + 1 : 0
                        )}
                        aria-label="Next image"
                      >
                        <FaChevronRight />
                      </button>
                      <button
                        className="product-image-zoom"
                        onClick={() => setShowImageZoom(true)}
                        aria-label="Zoom image"
                      >
                        <FaSearchPlus />
                      </button>
                    </>
                  )}
                  {product.videoUrl && (
                    <a
                      href={product.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="product-video-link"
                      aria-label="Watch product video"
                    >
                      <FaPlay />
                    </a>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="product-thumbnails">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        className={`product-thumbnail ${selectedImageIndex === idx ? 'active' : ''}`}
                        onClick={() => setSelectedImageIndex(idx)}
                      >
                        <img src={img} alt={`${product.name} view ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="product-image-placeholder">
                No image available
              </div>
            )}

            {/* Add to Favorites */}
            <button
              onClick={() => toggleFavorite(product)}
              className={`product-favorite-btn ${isFav ? 'active' : ''} margin-top-lg`}
            >
              <FaHeart />
              <span>Add to Favorites</span>
            </button>

            {/* Description */}
            {product.description && (
              <div className="product-description margin-top-lg">
                <h3 className="product-section-title">Description</h3>
                <p className="product-description-text">{product.description}</p>
              </div>
            )}
          </div>

          {/* Center Column - Product Info */}
          <div className="product-detail-info">
            <h1 className="product-detail-title">{product.name}</h1>

            {/* SKU */}
            {product.sku && (
              <div className="product-sku margin-top-sm">
                <span className="text-muted">SKU:</span> {product.sku}
              </div>
            )}

            {/* Pricing */}
            <div className="product-detail-pricing margin-top-lg">
              {product.sale && product.sale_proce > 0 ? (
                <>
                  <span className="price-sale price-large">
                    {formatPrice(product.sale_proce)}
                  </span>
                  <span className="price-original price-large margin-left-md">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="price price-large">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="product-quantity-selector margin-top-lg">
              <label className="product-quantity-label">Quantity:</label>
              <div className="product-quantity-controls">
                <button
                  className="product-quantity-btn"
                  onClick={() => handleQuantityChange(-1)}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="product-quantity-input"
                />
                <button
                  className="product-quantity-btn"
                  onClick={() => handleQuantityChange(1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Purchase Buttons */}
            <div className="product-purchase-buttons margin-top-lg">
              <button
                onClick={handleAddToCart}
                className="btn btn-primary btn-lg btn-full"
              >
                <FaShoppingCart style={{ marginRight: '0.5rem' }} />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="btn btn-secondary btn-lg btn-full margin-top-sm"
              >
                Buy Now
              </button>
            </div>

            {/* Technical Details Section */}
            {product.technicalDetails && (
              <div className="margin-top-lg">
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="btn btn-outline btn-lg btn-full"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between'
                  }}
                >
                  <span>Technical Details</span>
                  {showTechnicalDetails ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {showTechnicalDetails && (
                  <div className="product-technical-details margin-top-sm" style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '0.5rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <h3 className="product-section-title">Technical Details</h3>
                    <div className="product-details-text">
                      {product.technicalDetails.split('\n').filter(line => line.trim()).map((line, idx) => (
                        <p key={idx} className="product-detail-bullet">
                          <span className="product-bullet">•</span>
                          {line.trim()}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Details Section */}
            {product.additionalDetails && (
              <div className="margin-top-md">
                <button
                  onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                  className="btn btn-outline btn-lg btn-full"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between'
                  }}
                >
                  <span>Additional Details</span>
                  {showAdditionalDetails ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {showAdditionalDetails && (
                  <div className="product-additional-details margin-top-sm" style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '0.5rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <h3 className="product-section-title">Additional Information</h3>
                    <div className="product-details-text">
                      {product.additionalDetails.split('\n').filter(line => line.trim()).map((line, idx) => (
                        <p key={idx} className="product-detail-bullet">
                          <span className="product-bullet">•</span>
                          {line.trim()}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Customer Benefits & Info */}
          <div className="product-detail-sidebar">
            {/* Customer Benefits */}
            <div className="product-benefits-card">
              <h3 className="product-benefits-title">Why customers buy from us:</h3>
              <ul className="product-benefits-list">
                {product.warranty && (
                  <li className="product-benefit-item">
                    <FaCertificate className="product-benefit-icon" />
                    <span>Warranty: {product.warranty}</span>
                  </li>
                )}
                <li className="product-benefit-item">
                  <FaShieldAlt className="product-benefit-icon" />
                  <span>Secure payment options</span>
                </li>
                <li className="product-benefit-item">
                  <FaTruck className="product-benefit-icon" />
                  <span>Fast shipping available</span>
                </li>
                <li className="product-benefit-item">
                  <FaCertificate className="product-benefit-icon" />
                  <span>Products with warranty</span>
                </li>
              </ul>
            </div>

            {/* Shipping & Warranty */}
            <div className="product-info-card margin-top-md">
              {product.shippingInfo && (
                <div className="product-info-item">
                  <strong>Shipping:</strong> {product.shippingInfo}
                </div>
              )}
              {product.warranty && (
                <div className="product-info-item">
                  <strong>Warranty:</strong> {product.warranty}
                </div>
              )}
              <div className="product-info-item">
                <strong>Delivery time:</strong> 7 days, self-pickup option available
              </div>
            </div>

            {/* Customer Service */}
            <div className="product-service-links margin-top-md">
              <button className="product-service-link">
                <FaQuestionCircle />
                <span>Ask us about this product</span>
              </button>
              <a
                href={whatsappNumber 
                  ? `https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`I'm interested in: ${product.name}`)}`
                  : "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="product-service-link"
                onClick={(e) => {
                  if (!whatsappNumber) {
                    e.preventDefault();
                    alert("WhatsApp number not configured. Please contact the administrator.");
                  }
                }}
              >
                <FaWhatsapp />
                <span>Ask us on WhatsApp</span>
              </a>
            </div>

            {/* Social Sharing */}
            <div className="product-social-share margin-top-md">
              <button className="product-social-btn">
                <FaFacebook />
                <span>Like</span>
              </button>
              <button className="product-social-btn">
                <FaShare />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {showImageZoom && images.length > 0 && (
        <div
          className="image-zoom-modal"
          onClick={() => setShowImageZoom(false)}
        >
          <div className="image-zoom-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="image-zoom-close"
              onClick={() => setShowImageZoom(false)}
              aria-label="Close zoom"
            >
              ×
            </button>
            <img
              src={images[selectedImageIndex]}
              alt={product.name}
              className="image-zoom-img"
            />
          </div>
        </div>
      )}

      {/* Fly to Cart Animation */}
      {animationTrigger && (
        <FlyToCartAnimation
          productImage={animationTrigger.productImage}
          startPosition={animationTrigger.startPosition}
          onComplete={() => setAnimationTrigger(null)}
        />
      )}
    </main>
  );
}

