import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaTiktok, FaFacebook, FaInstagram, FaEnvelope, FaMapMarkerAlt, FaPhone, FaWhatsapp, FaClock } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Footer() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(`${API}/api/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load categories for footer:", err);
      }
    }
    loadCategories();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Site Map Column */}
        <div className="footer-column">
          <h3 className="footer-title">Site Map</h3>
          <ul className="footer-links">
            <li>
              <Link to="/shop">Shop</Link>
            </li>
            <li>
              <Link to="/favorites">Favorites</Link>
            </li>
            <li>
              <Link to="/cart">Cart</Link>
            </li>
            <li>
              <Link to="/profile">My Account</Link>
            </li>
            <li>
              <Link to="/about">About Us</Link>
            </li>
            <li>
              <Link to="/contact">Contact Us</Link>
            </li>
            <li>
              <Link to="/shipping">Shipping & Returns</Link>
            </li>
            <li>
              <Link to="/terms">Terms & Conditions</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy Policy</Link>
            </li>
          </ul>
        </div>

        {/* Main Categories Column */}
        <div className="footer-column">
          <h3 className="footer-title">Main Categories</h3>
          <ul className="footer-links">
            {categories.length > 0 ? (
              categories.slice(0, 10).map((category) => {
                const categoryName = typeof category === 'string' ? category : category.name;
                return (
                  <li key={categoryName}>
                    <Link to={`/products?category=${encodeURIComponent(categoryName)}`}>
                      {categoryName}
                    </Link>
                  </li>
                );
              })
            ) : (
              <>
                <li><Link to="/shop">All Products</Link></li>
                <li><Link to="/shop">Saddles</Link></li>
                <li><Link to="/shop">Bridles</Link></li>
                <li><Link to="/shop">Tack</Link></li>
                <li><Link to="/shop">Accessories</Link></li>
              </>
            )}
          </ul>
        </div>

        {/* Contact Us Column */}
        <div className="footer-column">
          <h3 className="footer-title">Contact Us</h3>
          <ul className="footer-contact">
            <li>
              <a href="tel:+972548740666" className="footer-contact-item">
                <FaPhone className="footer-icon" />
                <span>0548740666</span>
              </a>
            </li>
            <li>
              <a href="https://wa.me/+972548740666" className="footer-contact-item" target="_blank" rel="noopener noreferrer">
                <FaWhatsapp className="footer-icon" />
                <span>WhatsApp: 0548740666</span>
              </a>
            </li>
            <li>
              <a href="mailto:info@kingsmansaddlery.com" className="footer-contact-item">
                <FaEnvelope className="footer-icon" />
                <span>info@kingsmansaddlery.com</span>
              </a>
            </li>
            <li>
              <div className="footer-contact-item">
                <FaMapMarkerAlt className="footer-icon" />
                <span>123 Saddlery Lane<br />Horse Country, ST 12345</span>
              </div>
            </li>
            <li>
              <div className="footer-contact-item">
                <FaClock className="footer-icon" />
                <span>
                  Monday - Friday: 9:00 AM - 6:00 PM<br />
                  Saturday: 10:00 AM - 4:00 PM<br />
                  Sunday: Closed
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Welcome / Social Media Column */}
        <div className="footer-column">
          <h3 className="footer-title">Follow Us</h3>
          <div className="footer-social">
            <a 
              href="https://www.facebook.com/profile.php?id=100063785065499" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="Facebook"
            >
              <FaFacebook className="footer-social-icon" />
            </a>
            <a 
              href="https://www.instagram.com/kingsmansaddlery/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="Instagram"
            >
              <FaInstagram className="footer-social-icon" />
            </a>
            <a 
              href="https://www.tiktok.com/@kingsmansaddlery" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="Tiktok"
            >
              <FaTiktok className="footer-social-icon" />
            </a>
            <a 
              href="mailto:info@kingsmansaddlery.com"
              className="footer-social-link"
              aria-label="Email"
            >
              <FaEnvelope className="footer-social-icon" />
            </a>
            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="Google Maps"
            >
              <FaMapMarkerAlt className="footer-social-icon" />
            </a>
          </div>
          <div className="footer-welcome">
            <p>Welcome to visit our store!</p>
            <p className="footer-welcome-subtitle">Experience quality saddlery and tack</p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="footer-bottom-left">
            <span>© {new Date().getFullYear()} Kingsman Saddlery. All rights reserved.</span>
          </div>
          <div className="footer-bottom-right">
            <div className="footer-payment-icons">
              <span className="footer-payment-text">We accept:</span>
              <div className="footer-payment-logos">
                <span className="footer-payment-logo">VISA</span>
                <span className="footer-payment-logo">MasterCard</span>
                <span className="footer-payment-logo">PayPal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
