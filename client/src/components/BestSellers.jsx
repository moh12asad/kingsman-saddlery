import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { FaChevronLeft, FaChevronRight, FaHeart, FaShoppingCart } from "react-icons/fa";
import { auth } from "../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function BestSellers() {
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Load products
        const productsRes = await fetch(`${API}/api/products`);
        if (!productsRes.ok) {
          throw new Error("Failed to fetch products");
        }
        const productsData = await productsRes.json();
        const availableProducts = (productsData.products || []).filter(
          (product) => product.available === true
        );
        setProducts(availableProducts);

        // Load best seller product IDs
        const bestSellersRes = await fetch(`${API}/api/orders/best-sellers`);
        
        if (bestSellersRes.ok) {
          const bestSellersData = await bestSellersRes.json();
          const bestSellerIds = bestSellersData.productIds || [];

          // Get product details for best sellers
          const bestSellerProducts = bestSellerIds
            .map(id => availableProducts.find(p => p.id === id))
            .filter(Boolean); // Remove undefined products

          setBestSellers(bestSellerProducts);
        } else {
          // If best sellers can't be loaded, show empty
          setBestSellers([]);
        }
      } catch (err) {
        console.error("Error loading best sellers:", err);
        setBestSellers([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const cardWidth = 280;
      const scrollAmount = cardWidth + 20;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="best-sellers-section">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading best sellers...</p>
        </div>
      </section>
    );
  }

  if (bestSellers.length === 0) {
    return null; // Don't show section if no best sellers
  }

  return (
    <section className="best-sellers-section">
      <div className="best-sellers-header">
        <h2 className="best-sellers-title">Best Sellers</h2>
      </div>

      <div className="products-tabs-content">
        <div className="product-carousel-container">
          {bestSellers.length > 0 && (
            <>
              <button
                className="product-carousel-arrow product-carousel-arrow-left"
                onClick={() => scroll('left')}
                aria-label="Scroll left"
              >
                <FaChevronLeft />
              </button>
              <button
                className="product-carousel-arrow product-carousel-arrow-right"
                onClick={() => scroll('right')}
                aria-label="Scroll right"
              >
                <FaChevronRight />
              </button>
            </>
          )}
          <div className="product-carousel" ref={scrollRef}>
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => addToCart(product)}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={() => toggleFavorite(product)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, onAddToCart, isFavorite, onToggleFavorite }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCartClick = (e) => {
    e.stopPropagation();
    onAddToCart();
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div className="card-product-carousel" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="card-product-image-wrapper">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="card-product-image"
          />
        ) : (
          <div className="card-product-placeholder">
            No image
          </div>
        )}
        <button
          className={`card-product-favorite ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <FaHeart />
        </button>
        {product.sale && (
          <span className="card-product-badge">
            SALE
          </span>
        )}
      </div>
      <div className="card-product-content">
        <h3 className="card-product-title">
          {product.name}
        </h3>
        <div className="card-product-price">
          {product.sale && product.sale_proce > 0 ? (
            <>
              <span className="price-sale">
                ${product.sale_proce.toFixed(2)}
              </span>
              <span className="price-original">
                ${product.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="price">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCartClick}
          className="btn btn-primary btn-full padding-x-md padding-y-sm text-small font-medium transition margin-top-sm"
          style={{ marginTop: '0.75rem' }}
        >
          <FaShoppingCart style={{ marginRight: '0.5rem' }} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}

