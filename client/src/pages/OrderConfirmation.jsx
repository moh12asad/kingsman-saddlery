import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { auth } from "../lib/firebase";
import AuthRoute from "../components/AuthRoute";
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaUser, FaShoppingBag, FaEdit, FaCheck, FaTimes } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function OrderConfirmation() {
  const { cartItems, getTotalPrice, isLoaded } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      zipCode: "",
      country: ""
    }
  });
  
  // Order-specific address (can be different from profile address)
  const [orderAddress, setOrderAddress] = useState({
    street: "",
    city: "",
    zipCode: "",
    country: ""
  });
  
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [deliveryType, setDeliveryType] = useState("delivery"); // "delivery" or "pickup"
  
  // Delivery cost constant (50 ILS)
  const DELIVERY_COST = 50;

  useEffect(() => {
    if (!user) return;
    loadUserProfile();
  }, [user]);

  useEffect(() => {
    // Redirect to cart if cart is empty
    if (isLoaded && cartItems.length === 0) {
      navigate("/cart");
    }
  }, [isLoaded, cartItems.length, navigate]);

  async function loadUserProfile() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("Unable to load profile data");
        return;
      }
      
      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const profileAddress = data.address || {
          street: "",
          city: "",
          zipCode: "",
          country: ""
        };
        setProfileData({
          displayName: data.displayName || user?.displayName || "",
          email: data.email || user?.email || "",
          phone: data.phone || "",
          address: profileAddress
        });
        // Initialize order address with profile address
        setOrderAddress(profileAddress);
      } else {
        // Fallback to Firebase user data
        const emptyAddress = {
          street: "",
          city: "",
          zipCode: "",
          country: ""
        };
        setProfileData({
          displayName: user?.displayName || "",
          email: user?.email || "",
          phone: "",
          address: emptyAddress
        });
        setOrderAddress(emptyAddress);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile data");
      // Fallback to Firebase user data
      const emptyAddress = {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: ""
      };
      setProfileData({
        displayName: user?.displayName || "",
        email: user?.email || "",
        phone: "",
        address: emptyAddress
      });
      setOrderAddress(emptyAddress);
    } finally {
      setLoading(false);
    }
  }

  const subtotal = getTotalPrice();
  const deliveryCost = deliveryType === "delivery" ? DELIVERY_COST : 0;
  const total = subtotal + deliveryCost;
  
  // Check if address has been changed from profile
  const isAddressChanged = JSON.stringify(orderAddress) !== JSON.stringify(profileData.address);
  
  // Use order address if it's been changed, otherwise use profile address
  // When editing, always show orderAddress in the form
  const currentAddress = isAddressChanged ? orderAddress : profileData.address;
  // Delivery address is only required for delivery
  const hasCompleteAddress = deliveryType === "pickup" || (currentAddress.street && 
                             currentAddress.city && 
                             currentAddress.zipCode);
  
  function handleAddressChange(field, value) {
    setOrderAddress(prev => ({
      ...prev,
      [field]: value
    }));
  }
  
  function handleSaveAddress() {
    setIsEditingAddress(false);
  }
  
  function handleCancelEdit() {
    // Reset to profile address
    setOrderAddress(profileData.address);
    setIsEditingAddress(false);
  }
  
  function handleUseDifferentAddress() {
    setIsEditingAddress(true);
  }

  async function handleProceedToPayment() {
    try {
      setSendingEmail(true);
      setError("");
      setEmailSuccess("");
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("You must be signed in to proceed");
        return;
      }

      // Prepare order data
      const orderData = {
        customerName: profileData.displayName || user?.displayName || "Customer",
        customerEmail: profileData.email || user?.email,
        phone: profileData.phone || "",
        items: cartItems.map(item => ({
          id: item.id,
          productId: item.id || item.productId || "",
          name: item.name,
          image: item.image || "",
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: deliveryType === "delivery" ? currentAddress : null,
        total: total,
        subtotal: subtotal,
        tax: 0,
        status: "pending"
      };

      // Step 1: Process payment first
      const paymentRes = await fetch(`${API}/api/payment/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: total,
          currency: "ILS",
          // Add other payment method details as needed
        })
      });

      const paymentResult = await paymentRes.json();

      if (!paymentRes.ok || !paymentResult.success) {
        setError(paymentResult.error || "Payment processing failed. Please try again.");
        return;
      }

      // Step 2: Payment successful - now create order in database
      const orderRes = await fetch(`${API}/api/orders/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...orderData,
          status: "new", // New order status
          transactionId: paymentResult.transactionId,
          metadata: {
            paymentMethod: "credit_card", // Credit card payment
            deliveryType: deliveryType, // "delivery" or "pickup"
            transactionId: paymentResult.transactionId
          }
        })
      });

      const orderResult = await orderRes.json();

      if (!orderRes.ok) {
        setError(orderResult.error || "Payment succeeded but failed to create order. Please contact support.");
        // TODO: In production, you might want to handle refund here if order creation fails after payment
        return;
      }

      // Step 3: Order created successfully - send confirmation email
      const emailRes = await fetch(`${API}/api/email/order-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...orderData,
          orderNumber: orderResult.id,
          orderDate: new Date().toLocaleDateString(),
          status: "new",
          metadata: {
            paymentMethod: "credit_card",
            deliveryType: deliveryType,
            transactionId: paymentResult.transactionId
          }
        })
      });

      const emailResult = await emailRes.json();

      if (emailRes.ok) {
        setEmailSuccess(`Order #${orderResult.id.substring(0, 8)} created and paid successfully! Confirmation email sent to ${orderData.customerEmail}`);
        console.log("Payment processed, order created, and email sent successfully.");
        console.log("Order ID:", orderResult.id);
        console.log("Transaction ID:", paymentResult.transactionId);
      } else {
        // Payment and order succeeded but email failed - still show success
        setEmailSuccess(`Order #${orderResult.id.substring(0, 8)} created and paid successfully! However, the confirmation email could not be sent.`);
        console.warn("Payment and order succeeded but email failed:", emailResult.error);
      }
    } catch (err) {
      console.error("Error proceeding to payment:", err);
      setError(err.message || "Failed to process payment");
    } finally {
      setSendingEmail(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="text-center padding-y-lg">
            <div className="loading-spinner mx-auto"></div>
            <p className="margin-top-md text-muted">Loading order details...</p>
          </div>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return null; // Will redirect
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <h1 className="heading-1 margin-bottom-lg">Order Confirmation</h1>

          {error && (
            <div className="card padding-md margin-bottom-md" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
              <p className="text-error">{error}</p>
            </div>
          )}

          {emailSuccess && (
            <div className="card padding-md margin-bottom-md" style={{ background: "#dcfce7", borderColor: "#22c55e" }}>
              <p style={{ color: "#16a34a" }}>{emailSuccess}</p>
              <p style={{ color: "#16a34a", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Payment integration with Tranzilla will be implemented next. Your order details have been saved.
              </p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Order Details & Items */}
            <div className="space-y-6">
              {/* Order Items */}
              <div className="card">
                <div className="flex items-center justify-between margin-bottom-md">
                  <h2 className="section-title flex items-center gap-2">
                    <FaShoppingBag />
                    Order Items ({cartItems.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 padding-y-sm border-bottom">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-small">{item.name}</h3>
                        {item.category && (
                          <p className="text-xs text-muted">{item.category}</p>
                        )}
                        <div className="flex items-center gap-2 margin-top-xs">
                          <span className="text-sm text-muted">Qty: {item.quantity}</span>
                          <span className="text-sm font-semibold">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="margin-top-md padding-top-md border-top space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Subtotal:</span>
                    <span className="text-sm font-semibold">{formatPrice(subtotal)}</span>
                  </div>
                  {deliveryType === "delivery" && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Delivery:</span>
                      <span className="text-sm font-semibold">{formatPrice(DELIVERY_COST)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center padding-top-sm border-top">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Delivery Information */}
            <div className="space-y-6">
              {/* Delivery/Pickup Selection */}
              <div className="card">
                <h2 className="section-title margin-bottom-md">Delivery Options</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryType"
                      value="delivery"
                      checked={deliveryType === "delivery"}
                      onChange={(e) => setDeliveryType(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-semibold">Delivery</span>
                      <span className="text-sm text-muted ml-2">({formatPrice(DELIVERY_COST)})</span>
                      <p className="text-xs text-muted mt-1">We'll deliver your order to your address</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryType"
                      value="pickup"
                      checked={deliveryType === "pickup"}
                      onChange={(e) => setDeliveryType(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-semibold">Store Pickup</span>
                      <p className="text-xs text-muted mt-1">Pick up your order from our store</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Delivery Address - Only show for delivery */}
              {deliveryType === "delivery" && (
              <div className="card">
                <div className="flex items-center justify-between margin-bottom-md">
                  <h2 className="section-title flex items-center gap-2">
                    <FaMapMarkerAlt />
                    Delivery Address
                  </h2>
                  {!isEditingAddress && (
                    <div className="flex gap-2">
                      {isAddressChanged && (
                        <span className="text-xs text-muted flex items-center">
                          (Custom for this order)
                        </span>
                      )}
                      <button
                        onClick={handleUseDifferentAddress}
                        className="btn btn-sm flex items-center gap-1"
                      >
                        <FaEdit />
                        {isAddressChanged ? "Change" : "Use Different"}
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingAddress ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted block margin-bottom-xs">Street Address</label>
                      <input
                        type="text"
                        className="input"
                        value={orderAddress.street}
                        onChange={(e) => handleAddressChange("street", e.target.value)}
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block margin-bottom-xs">City</label>
                      <input
                        type="text"
                        className="input"
                        value={orderAddress.city}
                        onChange={(e) => handleAddressChange("city", e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted block margin-bottom-xs">ZIP Code</label>
                        <input
                          type="text"
                          className="input"
                          value={orderAddress.zipCode}
                          onChange={(e) => handleAddressChange("zipCode", e.target.value)}
                          placeholder="ZIP Code"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted block margin-bottom-xs">Country</label>
                        <input
                          type="text"
                          className="input"
                          value={orderAddress.country}
                          onChange={(e) => handleAddressChange("country", e.target.value)}
                          placeholder="Country"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 margin-top-md">
                      <button
                        onClick={handleSaveAddress}
                        className="btn-primary btn-sm flex items-center gap-1"
                      >
                        <FaCheck />
                        Save Address
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-sm flex items-center gap-1"
                      >
                        <FaTimes />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : hasCompleteAddress ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">{profileData.displayName || "N/A"}</p>
                    <p>{currentAddress.street}</p>
                    <p>
                      {currentAddress.city} {currentAddress.zipCode}
                    </p>
                    {currentAddress.country && (
                      <p>{currentAddress.country}</p>
                    )}
                    {isAddressChanged && (
                      <p className="text-xs text-muted margin-top-sm">
                        This address is different from your profile address and will only be used for this order.
                      </p>
                    )}
                    <div className="margin-top-sm">
                      <Link
                        to="/profile"
                        className="text-xs text-muted underline"
                      >
                        Update default address in profile
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="padding-y-md">
                    <p className="text-muted text-sm margin-bottom-md">
                      Please complete your delivery address.
                    </p>
                    <button
                      onClick={handleUseDifferentAddress}
                      className="btn-primary btn-sm margin-bottom-sm"
                    >
                      Add Address for This Order
                    </button>
                    <div className="margin-top-sm">
                      <Link to="/profile" className="text-xs text-muted underline">
                        Or update your default address in profile
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Contact Information */}
              <div className="card">
                <h2 className="section-title margin-bottom-md">Contact Information</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-muted" />
                    <span>{profileData.displayName || "Not set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-muted" />
                    <span>{profileData.email || "Not set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-muted" />
                    <span>{profileData.phone || "Not set"}</span>
                  </div>
                  {!profileData.phone && (
                    <Link to="/profile" className="btn btn-sm margin-top-sm">
                      Add Phone Number
                    </Link>
                  )}
                </div>
              </div>

              {/* Payment Section - Placeholder for Tranzilla */}
              <div className="card">
                <h2 className="section-title margin-bottom-md">Payment</h2>
                <div className="padding-y-md">
                  <p className="text-muted text-sm margin-bottom-md">
                    Payment integration will be configured with Tranzilla.
                  </p>
                  <div className="card padding-md" style={{ background: "#f3f4f6", borderColor: "#d1d5db" }}>
                    <p className="text-sm text-muted text-center">
                      Payment gateway coming soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 margin-top-lg">
            <Link to="/cart" className="btn btn-secondary">
              Back to Cart
            </Link>
            <button
              className="btn-primary"
              disabled={!hasCompleteAddress || !profileData.phone || sendingEmail}
              onClick={handleProceedToPayment}
            >
              {sendingEmail 
                ? "Processing..."
                : !hasCompleteAddress || !profileData.phone
                ? "Complete Information to Continue"
                : `Proceed to Payment (${formatPrice(total)})`}
            </button>
          </div>

          {(!hasCompleteAddress || !profileData.phone) && (
            <div className="card padding-md margin-top-md" style={{ background: "#fef3c7", borderColor: "#f59e0b" }}>
              <p className="text-sm" style={{ color: "#92400e" }}>
                <strong>Please complete the following:</strong>{" "}
                {deliveryType === "delivery" && !hasCompleteAddress && (
                  <>
                    {isEditingAddress 
                      ? "Complete the delivery address fields above. "
                      : "Add a complete delivery address. "}
                  </>
                )}
                {!profileData.phone && "Add a phone number. "}
                {deliveryType === "delivery" && !hasCompleteAddress && !isEditingAddress && (
                  <button onClick={handleUseDifferentAddress} className="underline">
                    Add Address for This Order
                  </button>
                )}
                {!profileData.phone && (
                  <>
                    {" "}or{" "}
                    <Link to="/profile" className="underline">
                      Update Profile
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </main>
    </AuthRoute>
  );
}

