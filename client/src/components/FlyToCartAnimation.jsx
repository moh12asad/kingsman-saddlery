import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

let animationId = 0;

export default function FlyToCartAnimation({ productImage, startPosition, onComplete }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [endPosition, setEndPosition] = useState(null);
  const animationRef = useRef(null);
  const currentIdRef = useRef(null);

  useEffect(() => {
    if (startPosition && productImage) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        // Get cart icon position from DOM - try multiple selectors
        let cartIcon = null;
        
        // Try multiple ways to find the cart icon
        const selectors = [
          'a[href="/cart"]',
          'a[href*="cart"]',
          '.navbar-links a',
          'nav a'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (let el of elements) {
            const href = el.getAttribute('href');
            const hasCartIcon = el.querySelector('svg') || el.textContent?.toLowerCase().includes('cart');
            if (href?.includes('cart') || (hasCartIcon && href)) {
              cartIcon = el;
              break;
            }
          }
          if (cartIcon) break;
        }
        
        let targetX = window.innerWidth - 100;
        let targetY = 60;

        if (cartIcon) {
          const rect = cartIcon.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
        } else {
          // Fallback: try to find any shopping cart icon
          const svgIcons = document.querySelectorAll('svg');
          for (let svg of svgIcons) {
            const parent = svg.closest('a, button');
            if (parent && (parent.getAttribute('href')?.includes('cart') || parent.textContent?.toLowerCase().includes('cart'))) {
              const rect = parent.getBoundingClientRect();
              targetX = rect.left + rect.width / 2;
              targetY = rect.top + rect.height / 2;
              break;
            }
          }
        }

        currentIdRef.current = ++animationId;
        const id = currentIdRef.current;
        setEndPosition({ x: targetX, y: targetY });
        setIsAnimating(true);

        const timer = setTimeout(() => {
          if (currentIdRef.current === id) {
            setIsAnimating(false);
            if (onComplete) onComplete();
          }
        }, 1000);

        return () => clearTimeout(timer);
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, [startPosition, productImage, onComplete]);


  if (!isAnimating || !startPosition || !productImage || !endPosition) {
    return null;
  }

  const deltaX = endPosition.x - startPosition.x;
  const deltaY = endPosition.y - startPosition.y;
  const animKey = `flyToCart-${animationId}`;

  const style = {
    position: 'fixed',
    left: `${startPosition.x}px`,
    top: `${startPosition.y}px`,
    width: '60px',
    height: '60px',
    zIndex: 99999,
    pointerEvents: 'none',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    backgroundColor: '#fff',
    border: '2px solid #000',
  };

  const animationStyle = `
    @keyframes ${animKey} {
      0% {
        transform: translate(0, 0) scale(1);
        opacity: 1;
      }
      50% {
        transform: translate(${deltaX * 0.5}px, ${deltaY * 0.5}px) scale(0.6);
        opacity: 0.8;
      }
      100% {
        transform: translate(${deltaX}px, ${deltaY}px) scale(0.2);
        opacity: 0;
      }
    }
  `;

  const animatedStyle = {
    ...style,
    animation: `${animKey} 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
  };

  return createPortal(
    <>
      <style>{animationStyle}</style>
      <div ref={animationRef} style={animatedStyle}>
        {productImage ? (
          <img 
            src={productImage} 
            alt="Flying to cart" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.parentElement) {
                e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#000;font-size:12px;">✓</div>';
              }
            }}
          />
        ) : (
          <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#000', fontSize: '20px'}}>✓</div>
        )}
      </div>
    </>,
    document.body
  );
}

