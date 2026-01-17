import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCurrency } from "../context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { getTranslated } from "../utils/translations";
import FlyToCartAnimation from "../components/FlyToCartAnimation";
import { 
  FaHeart, 
  FaShoppingCart, 
  FaChevronLeft, 
  FaChevronRight, 
  FaSearchPlus,
  FaPlay,
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
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [animationTrigger, setAnimationTrigger] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    loadProduct();
    loadSettings();
  }, [id, i18n.language]);

  useEffect(() => {
    if (product?.relatedProducts && product.relatedProducts.length > 0) {
      loadRelatedProducts();
    } else {
      setRelatedProducts([]);
    }
  }, [product?.relatedProducts, i18n.language]);

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
      const lang = i18n.language || 'en';
      const response = await fetch(`${API}/api/products?lang=${lang}`);
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

  async function loadRelatedProducts() {
    try {
      if (!product?.relatedProducts || product.relatedProducts.length === 0) {
        setRelatedProducts([]);
        return;
      }

      const lang = i18n.language || 'en';
      const response = await fetch(`${API}/api/products?lang=${lang}`);
      const data = await response.json();
      
      if (response.ok && data.products) {
        const related = data.products.filter(p => 
          product.relatedProducts.includes(p.id)
        );
        setRelatedProducts(related);
      }
    } catch (err) {
      console.error("Error loading related products:", err);
      setRelatedProducts([]);
    }
  }

  const handleAddToCart = (e) => {
    if (product) {
      const productWithOptions = {
        ...product,
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null,
      };
      for (let i = 0; i < quantity; i++) {
        addToCart(productWithOptions);
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
            <p className="margin-top-md text-muted">{t("productDetail.loading")}</p>
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
            <p className="text-error heading-3">{error || t("productDetail.notFound")}</p>
            <button
              onClick={() => navigate("/shop")}
              className="btn btn-secondary margin-top-md"
            >
              {t("productDetail.backToShop")}
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
          <Link to="/" className="breadcrumb-link">{t("productDetail.home")}</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/shop" className="breadcrumb-link">{t("productDetail.shop")}</Link>
          {product.category && (
            <>
              <span className="breadcrumb-separator">/</span>
              <Link 
                to={`/products?category=${encodeURIComponent(getTranslated(product.category, i18n.language || 'en'))}`} 
                className="breadcrumb-link"
              >
                {getTranslated(product.category, i18n.language || 'en')}
              </Link>
            </>
          )}
          {product.subCategory && (
            <>
              <span className="breadcrumb-separator">/</span>
              <Link 
                to={`/products?category=${encodeURIComponent(getTranslated(product.category, i18n.language || 'en'))}&subcategory=${encodeURIComponent(getTranslated(product.subCategory, i18n.language || 'en'))}`} 
                className="breadcrumb-link"
              >
                {getTranslated(product.subCategory, i18n.language || 'en')}
              </Link>
            </>
          )}
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-text">{getTranslated(product.name, i18n.language || 'en')}</span>
        </nav>

        <div className="product-detail-grid">
          {/* Left Column - Product Images */}
          <div className="product-detail-images">
            {images.length > 0 ? (
              <>
                <div className="product-main-image-wrapper">
                  <img
                    src={images[selectedImageIndex]}
                    alt={getTranslated(product.name, i18n.language || 'en')}
                    className="product-main-image"
                  />
                  {/* Favorite Button on Image */}
                  <button
                    className={`product-image-favorite ${isFav ? 'active' : ''}`}
                    onClick={() => toggleFavorite(product)}
                    aria-label={t("productDetail.addToFavorites")}
                  >
                    <FaHeart />
                  </button>
                  {images.length > 1 && (
                    <>
                      <button
                        className="product-image-nav product-image-nav-left"
                        onClick={() => setSelectedImageIndex(prev => 
                          prev > 0 ? prev - 1 : images.length - 1
                        )}
                        aria-label={t("productDetail.previousImage")}
                      >
                        <FaChevronLeft />
                      </button>
                      <button
                        className="product-image-nav product-image-nav-right"
                        onClick={() => setSelectedImageIndex(prev => 
                          prev < images.length - 1 ? prev + 1 : 0
                        )}
                        aria-label={t("productDetail.nextImage")}
                      >
                        <FaChevronRight />
                      </button>
                      <button
                        className="product-image-zoom"
                        onClick={() => setShowImageZoom(true)}
                        aria-label={t("productDetail.zoomImage")}
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
                      aria-label={t("productDetail.watchProductVideo")}
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
                        <img src={img} alt={`${getTranslated(product.name, i18n.language || 'en')} view ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="product-image-placeholder">
                {t("productDetail.noImageAvailable")}
              </div>
            )}


            {/* Description */}
            {product.description && (
              <div className="product-description margin-top-lg">
                <h3 className="product-section-title">{t("productDetail.description")}</h3>
                <p className="product-description-text">{getTranslated(product.description, i18n.language || 'en')}</p>
              </div>
            )}
          </div>

          {/* Center Column - Product Info */}
          <div className="product-detail-info">
            <h1 className="product-detail-title">{getTranslated(product.name, i18n.language || 'en')}</h1>

            {/* SKU */}
            {product.sku && (
              <div className="product-sku margin-top-sm">
                <span className="text-muted">{t("productDetail.sku")}</span> {product.sku}
              </div>
            )}

            {/* Weight */}
            {product.weight && product.weight > 0 && (
              <div className="product-sku margin-top-sm">
                <span className="text-muted">Weight:</span> {product.weight.toFixed(2)} kg
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
            
            {/* Price Note */}
            <div className="product-sku margin-top-sm">
              <p className="text-xs text-muted">
                {t("productDetail.priceNote")}
              </p>
            </div>

            {/* Size Selector */}
            {product.size && Array.isArray(product.size) && product.size.length > 0 && (
              <div className="product-option-selector margin-top-lg">
                <label className="product-option-label">{t("productDetail.size")}</label>
                <select
                  className="product-option-select"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                >
                  <option value="">{t("productDetail.selectSize")}</option>
                  {product.size.map((size, idx) => (
                    <option key={idx} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Color Selector */}
            {product.color && Array.isArray(product.color) && product.color.length > 0 && (
              <div className="product-option-selector margin-top-lg">
                <label className="product-option-label">{t("productDetail.color")}</label>
                <select
                  className="product-option-select"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                >
                  <option value="">{t("productDetail.selectColor")}</option>
                  {product.color.map((color, idx) => (
                    <option key={idx} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="product-quantity-selector margin-top-lg">
              <label className="product-quantity-label">{t("productDetail.quantity")}</label>
              <div className="product-quantity-controls">
                <button
                  className="product-quantity-btn"
                  onClick={() => handleQuantityChange(-1)}
                  aria-label={t("productDetail.decreaseQuantity")}
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
                  aria-label={t("productDetail.increaseQuantity")}
                >
                  +
                </button>
              </div>
            </div>

            {/* Purchase Buttons */}
            <div className="product-purchase-buttons margin-top-lg">
              <button
                onClick={handleAddToCart}
                className="btn btn-secondary btn-lg"
              >
                <FaShoppingCart style={{ marginRight: '0.5rem' }} />
                {t("productDetail.addToCart")}
              </button>
              <button
                onClick={handleBuyNow}
                className="btn btn-cta btn-lg"
              >
                {t("productDetail.buyNow")}
              </button>
            </div>

            {/* WhatsApp Button - Close to Purchase Buttons */}
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`I'm interested in: ${getTranslated(product.name, i18n.language || 'en')}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="product-whatsapp-cta margin-top-md"
              >
                <FaWhatsapp />
                <span>{t("productDetail.askOnWhatsApp")}</span>
              </a>
            )}

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
                  <span>{t("productDetail.technicalDetails")}</span>
                  {showTechnicalDetails ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {showTechnicalDetails && (
                  <div className="product-technical-details margin-top-sm" style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '0.5rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <h3 className="product-section-title">{t("productDetail.technicalDetails")}</h3>
                    <div className="product-details-text">
                      {getTranslated(product.technicalDetails, i18n.language || 'en').split('\n').filter(line => line.trim()).map((line, idx) => (
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
                  <span>{t("productDetail.additionalDetails")}</span>
                  {showAdditionalDetails ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {showAdditionalDetails && (
                  <div className="product-additional-details margin-top-sm" style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '0.5rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <h3 className="product-section-title">{t("productDetail.additionalInformation")}</h3>
                    <div className="product-details-text">
                      {getTranslated(product.additionalDetails, i18n.language || 'en').split('\n').filter(line => line.trim()).map((line, idx) => (
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
              <h3 className="product-benefits-title">{t("productDetail.whyCustomersBuy")}</h3>
              <ul className="product-benefits-list">
                {product.warranty && (
                  <li className="product-benefit-item">
                    <FaCertificate className="product-benefit-icon" />
                    <span>{t("productDetail.warranty")} {getTranslated(product.warranty, i18n.language || 'en')}</span>
                  </li>
                )}
                <li className="product-benefit-item">
                  <FaShieldAlt className="product-benefit-icon" />
                  <span>{t("productDetail.securePayment")}</span>
                </li>
                <li className="product-benefit-item">
                  <FaTruck className="product-benefit-icon" />
                  <span>{t("productDetail.fastShipping")}</span>
                </li>
                <li className="product-benefit-item">
                  <FaCertificate className="product-benefit-icon" />
                  <span>{t("productDetail.productsWithWarranty")}</span>
                </li>
              </ul>
            </div>

            {/* Shipping & Warranty */}
            <div className="product-info-card margin-top-md">
              {product.shippingInfo && (
                <div className="product-info-item">
                  <strong>{t("productDetail.shipping")}</strong> {getTranslated(product.shippingInfo, i18n.language || 'en')}
                </div>
              )}
              {product.warranty && (
                <div className="product-info-item">
                  <strong>{t("productDetail.warranty")}</strong> {getTranslated(product.warranty, i18n.language || 'en')}
                </div>
              )}
              <div className="product-info-item">
                <strong>{t("productDetail.deliveryTime")}</strong> {t("productDetail.deliveryTimeValue")}
              </div>
            </div>

          </div>
        </div>

        {/* Related Products Section - Moved Higher */}
        {relatedProducts.length > 0 && (
          <div className="related-products-section">
            <h2 className="related-products-title">
              {t("productDetail.relatedProducts")}
            </h2>
            <div className="related-products-grid">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  className="card-product-carousel"
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                >
                  <div className="card-product-image-wrapper">
                    <div className="card-product-image-container">
                      {relatedProduct.image ? (
                        <img
                          src={relatedProduct.image}
                          alt={getTranslated(relatedProduct.name, i18n.language || 'en')}
                          className="card-product-image"
                        />
                      ) : (
                        <div className="card-product-placeholder">
                          {t("products.noImage")}
                        </div>
                      )}
                      <button
                        className={`card-product-favorite ${isFavorite(relatedProduct.id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(relatedProduct);
                        }}
                        aria-label={isFavorite(relatedProduct.id) ? t("products.removeFromFavorites") : t("products.addToFavorites")}
                      >
                        <FaHeart />
                      </button>
                      {relatedProduct.sale && (
                        <span className="card-product-badge">
                          <span className="badge-text">{t("products.sale")}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="card-product-content">
                    <h3 className="card-product-title">
                      {getTranslated(relatedProduct.name, i18n.language || 'en')}
                    </h3>
                    <div className="card-product-separator"></div>
                    <div className="card-product-price">
                      {relatedProduct.sale && relatedProduct.sale_proce > 0 ? (
                        <>
                          <span className="price-sale">
                            {formatPrice(relatedProduct.sale_proce)}
                          </span>
                          <span className="price-original">
                            {formatPrice(relatedProduct.price)}
                          </span>
                        </>
                      ) : (
                        <span className="price">
                          {formatPrice(relatedProduct.price)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(relatedProduct);
                        
                        // Trigger animation
                        const buttonRect = e.currentTarget.getBoundingClientRect();
                        const position = {
                          x: buttonRect.left + buttonRect.width / 2 - 30,
                          y: buttonRect.top + buttonRect.height / 2 - 30
                        };
                        setAnimationTrigger({
                          productImage: relatedProduct.image,
                          startPosition: position
                        });
                      }}
                      className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition margin-top-sm"
                      style={{ marginTop: '0.75rem' }}
                    >
                      <FaShoppingCart style={{ marginRight: '0.5rem' }} />
                      {t("products.addToCart")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
              aria-label={t("productDetail.closeZoom")}
            >
              ×
            </button>
            <img
              src={images[selectedImageIndex]}
              alt={getTranslated(product.name, i18n.language || 'en')}
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

