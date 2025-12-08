import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import { useTranslatedContent } from "../hooks/useTranslatedContent";
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
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { formatPrice } = useCurrency();
  const { t, language } = useLanguage();
  
  // Get translated product content
  const productName = useTranslatedContent(product?.name);
  const productDescription = useTranslatedContent(product?.description);
  const productCategory = useTranslatedContent(product?.category);
  const productSubCategory = useTranslatedContent(product?.subCategory);
  const productTechnicalDetails = useTranslatedContent(product?.technicalDetails);
  const productAdditionalDetails = useTranslatedContent(product?.additionalDetails);
  const productWarranty = useTranslatedContent(product?.warranty);
  const productShippingInfo = useTranslatedContent(product?.shippingInfo);

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

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
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
            <p className="margin-top-md text-muted">{t("product.loadingProduct")}</p>
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
            <p className="text-error heading-3">{error || t("product.productNotFound")}</p>
            <button
              onClick={() => navigate("/shop")}
              className="btn btn-primary margin-top-md"
            >
              {t("product.backToShop")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="product-detail-page">
      <div className="container-main padding-y-xl" style={{ paddingTop: '3rem' }}>
        {/* Breadcrumbs */}
        <nav className="breadcrumbs margin-bottom-lg">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/shop" className="breadcrumb-link">Shop</Link>
          {productCategory && (
            <>
              <span className="breadcrumb-separator">/</span>
              <Link 
                to={`/products?category=${encodeURIComponent(productCategory)}`} 
                className="breadcrumb-link"
              >
                {productCategory}
              </Link>
            </>
          )}
          {productSubCategory && (
            <>
              <span className="breadcrumb-separator">/</span>
              <Link 
                to={`/products?category=${encodeURIComponent(productCategory)}&subcategory=${encodeURIComponent(productSubCategory)}`} 
                className="breadcrumb-link"
              >
                {productSubCategory}
              </Link>
            </>
          )}
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-text">{productName}</span>
        </nav>

        <div className="product-detail-grid">
          {/* Left Column - Product Images */}
          <div className="product-detail-images">
            {images.length > 0 ? (
              <>
                <div className="product-main-image-wrapper">
                  <img
                    src={images[selectedImageIndex]}
                    alt={productName}
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
                        <img src={img} alt={`${productName} view ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="product-image-placeholder">
                {t("product.noImageAvailable")}
              </div>
            )}

            {/* Add to Favorites */}
            <button
              onClick={() => toggleFavorite(product)}
              className={`product-favorite-btn ${isFav ? 'active' : ''} margin-top-lg`}
            >
              <FaHeart />
              <span>{t("product.addToFavorites")}</span>
            </button>

            {/* Description */}
            {productDescription && (
              <div className="product-description margin-top-lg">
                <h3 className="product-section-title">{t("product.description")}</h3>
                <p className="product-description-text">{productDescription}</p>
              </div>
            )}
          </div>

          {/* Center Column - Product Info */}
          <div className="product-detail-info">
            <h1 className="product-detail-title">{productName}</h1>

            {/* SKU */}
            {product.sku && (
              <div className="product-sku margin-top-sm">
                <span className="text-muted">{t("product.sku")}</span> {product.sku}
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
              <label className="product-quantity-label">{t("product.quantity")}:</label>
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
                {t("product.addToCart")}
              </button>
              <button
                onClick={handleBuyNow}
                className="btn btn-secondary btn-lg btn-full margin-top-sm"
              >
                {t("product.buyNow")}
              </button>
            </div>

            {/* Technical Details Section */}
            {productTechnicalDetails && (
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
                  <span>{t("product.technicalDetails")}</span>
                  {showTechnicalDetails ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {showTechnicalDetails && (
                  <div className="product-technical-details margin-top-sm" style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '0.5rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <h3 className="product-section-title">{t("product.technicalDetails")}</h3>
                    <div className="product-details-text">
                      {productTechnicalDetails.split('\n').filter(line => line.trim()).map((line, idx) => (
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
            {productAdditionalDetails && (
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
                  <span>{t("product.additionalDetails")}</span>
                  {showAdditionalDetails ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {showAdditionalDetails && (
                  <div className="product-additional-details margin-top-sm" style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '0.5rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <h3 className="product-section-title">{t("product.additionalInformation")}</h3>
                    <div className="product-details-text">
                      {productAdditionalDetails.split('\n').filter(line => line.trim()).map((line, idx) => (
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
              <h3 className="product-benefits-title">{t("product.whyCustomersBuy")}</h3>
              <ul className="product-benefits-list">
                {productWarranty && (
                  <li className="product-benefit-item">
                    <FaCertificate className="product-benefit-icon" />
                    <span>{t("admin.warranty")}: {productWarranty}</span>
                  </li>
                )}
                <li className="product-benefit-item">
                  <FaShieldAlt className="product-benefit-icon" />
                  <span>{t("product.securePayment")}</span>
                </li>
                <li className="product-benefit-item">
                  <FaTruck className="product-benefit-icon" />
                  <span>{t("product.fastShipping")}</span>
                </li>
                <li className="product-benefit-item">
                  <FaCertificate className="product-benefit-icon" />
                  <span>{t("product.productsWithWarranty")}</span>
                </li>
              </ul>
            </div>

            {/* Shipping & Warranty */}
            <div className="product-info-card margin-top-md">
              {productShippingInfo && (
                <div className="product-info-item">
                  <strong>{t("admin.shippingInfo")}:</strong> {productShippingInfo}
                </div>
              )}
              {productWarranty && (
                <div className="product-info-item">
                  <strong>{t("admin.warranty")}:</strong> {productWarranty}
                </div>
              )}
              <div className="product-info-item">
                <strong>{t("product.deliveryTime")}</strong> {t("product.daysSelfPickup")}
              </div>
            </div>

            {/* Customer Service */}
            <div className="product-service-links margin-top-md">
              <button className="product-service-link">
                <FaQuestionCircle />
                <span>{t("product.askAboutProduct")}</span>
              </button>
              <a
                href={whatsappNumber 
                  ? `https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`I'm interested in: ${productName}`)}`
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
                <span>{t("product.askOnWhatsApp")}</span>
              </a>
            </div>

            {/* Social Sharing */}
            <div className="product-social-share margin-top-md">
              <button className="product-social-btn">
                <FaFacebook />
                <span>{t("product.like")}</span>
              </button>
              <button className="product-social-btn">
                <FaShare />
                <span>{t("product.share")}</span>
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
              alt={productName}
              className="image-zoom-img"
            />
          </div>
        </div>
      )}
    </main>
  );
}

