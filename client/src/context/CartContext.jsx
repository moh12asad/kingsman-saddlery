import { createContext, useContext, useMemo, useState, useEffect } from "react";

const CartContext = createContext({
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotalItems: () => 0,
  getTotalPrice: () => 0,
  getTotalWeight: () => 0,
});

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper function to normalize undefined/null values for comparison
  // Treats both undefined and null as equivalent (null)
  const normalizeValue = (value) => {
    return value === undefined || value === null ? null : value;
  };

  // Helper function to check if two values are equal (treating undefined and null as equivalent)
  const valuesEqual = (a, b) => {
    return normalizeValue(a) === normalizeValue(b);
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          // Normalize cart items: convert undefined to null for selectedSize and selectedColor
          const normalized = parsed.map(item => ({
            ...item,
            selectedSize: normalizeValue(item.selectedSize),
            selectedColor: normalizeValue(item.selectedColor),
          }));
          setCartItems(normalized);
        }
      }
    } catch (err) {
      console.error("Failed to load cart from localStorage:", err);
      // Clear corrupted data
      localStorage.removeItem("cart");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem("cart", JSON.stringify(cartItems));
      } catch (err) {
        console.error("Failed to save cart to localStorage:", err);
      }
    }
  }, [cartItems, isLoaded]);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const selectedSize = normalizeValue(product.selectedSize);
      const selectedColor = normalizeValue(product.selectedColor);
      
      // Find existing item with same ID, size, and color
      const existingItem = prev.find((item) => 
        item.id === product.id && 
        valuesEqual(item.selectedSize, selectedSize) && 
        valuesEqual(item.selectedColor, selectedColor)
      );
      
      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id && 
          valuesEqual(item.selectedSize, selectedSize) && 
          valuesEqual(item.selectedColor, selectedColor)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.sale && product.sale_proce > 0 ? product.sale_proce : product.price,
          image: product.image,
          category: product.category,
          description: product.description || "",
          sale: product.sale,
          originalPrice: product.price,
          weight: product.weight || 0,
          quantity: 1,
          selectedSize: selectedSize,
          selectedColor: selectedColor,
        },
      ];
    });
  };

  const removeFromCart = (productId, selectedSize = null, selectedColor = null) => {
    setCartItems((prev) => {
      const normalizedSize = normalizeValue(selectedSize);
      const normalizedColor = normalizeValue(selectedColor);
      return prev.filter((item) => 
        !(item.id === productId && 
          valuesEqual(item.selectedSize, normalizedSize) && 
          valuesEqual(item.selectedColor, normalizedColor))
      );
    });
  };

  const updateQuantity = (productId, quantity, selectedSize = null, selectedColor = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize, selectedColor);
      return;
    }
    setCartItems((prev) => {
      const normalizedSize = normalizeValue(selectedSize);
      const normalizedColor = normalizeValue(selectedColor);
      return prev.map((item) =>
        item.id === productId && 
        valuesEqual(item.selectedSize, normalizedSize) && 
        valuesEqual(item.selectedColor, normalizedColor)
          ? { ...item, quantity: Math.max(1, quantity) } 
          : item
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalWeight = () => {
    return cartItems.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
  };

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice,
      getTotalWeight,
      isLoaded,
    }),
    [cartItems, isLoaded]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

