import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";
import { auth } from "../lib/firebase";
import AuthRoute from "../components/AuthRoute";
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaUser, FaShoppingBag, FaEdit, FaCheck, FaTimes } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function OrderConfirmation() {
  const { cartItems, getTotalPrice, isLoaded } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { t, language } = useLanguage();
  
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

  const total = getTotalPrice();
  
  // Check if address has been changed from profile
  const isAddressChanged = JSON.stringify(orderAddress) !== JSON.stringify(profileData.address);
  
  // Use order address if it's been changed, otherwise use profile address
  // When editing, always show orderAddress in the form
  const currentAddress = isAddressChanged ? orderAddress : profileData.address;
  const hasCompleteAddress = currentAddress.street && 
                             currentAddress.city && 
                             currentAddress.zipCode;
  
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

      // Prepare order data for email
      const orderData = {
        customerName: profileData.displayName || user?.displayName || "Customer",
        customerEmail: profileData.email || user?.email,
        items: cartItems.map(item => ({
          name: item.name,
          image: item.image || "",
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: currentAddress,
        total: total,
        orderDate: new Date().toLocaleDateString(),
        status: "pending" // Will be updated to "paid" after Tranzilla payment
      };

      // Send order confirmation email
      const res = await fetch(`${API}/api/email/order-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();

      if (res.ok) {
        setEmailSuccess(`${t("orderConfirmation.orderConfirmationEmailSent")} ${orderData.customerEmail}`);
        // TODO: After Tranzilla integration, redirect to payment gateway here
        // For now, just show success message
        console.log("Order prepared. Ready for Tranzilla payment integration.");
        console.log("Order data:", orderData);
      } else {
        setError(data.error || "Failed to send order confirmation email");
      }
    } catch (err) {
      console.error("Error proceeding to payment:", err);
      setError(err.message || "Failed to process order");
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
            <p className="margin-top-md text-muted">{t("orderConfirmation.loadingOrderDetails")}</p>
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
          <h1 className="heading-1 margin-bottom-lg">{t("orderConfirmation.title")}</h1>

          {error && (
            <div className="card padding-md margin-bottom-md" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
              <p className="text-error">{error}</p>
            </div>
          )}

          {emailSuccess && (
            <div className="card padding-md margin-bottom-md" style={{ background: "#dcfce7", borderColor: "#22c55e" }}>
              <p style={{ color: "#16a34a" }}>{emailSuccess}</p>
              <p style={{ color: "#16a34a", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                {t("orderConfirmation.paymentIntegrationImplementedNext")}
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
                    {t("orderConfirmation.orderItems")} ({cartItems.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 padding-y-sm border-bottom">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={getTranslatedContent(item.name, language)}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">
                          {t("orderConfirmation.noImage")}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-small">{getTranslatedContent(item.name, language)}</h3>
                        {item.category && (
                          <p className="text-xs text-muted">{getTranslatedContent(item.category, language)}</p>
                        )}
                        <div className="flex items-center gap-2 margin-top-xs">
                          <span className="text-sm text-muted">{t("orderConfirmation.qty")} {item.quantity}</span>
                          <span className="text-sm font-semibold">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="margin-top-md padding-top-md border-top">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{t("orderConfirmation.total")}</span>
                    <span className="text-lg font-bold">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Shipping Information */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="card">
                <div className="flex items-center justify-between margin-bottom-md">
                  <h2 className="section-title flex items-center gap-2">
                    <FaMapMarkerAlt />
                    {t("orderConfirmation.shippingAddress")}
                  </h2>
                  {!isEditingAddress && (
                    <div className="flex gap-2">
                      {isAddressChanged && (
                        <span className="text-xs text-muted flex items-center">
                          {t("orderConfirmation.customForThisOrder")}
                        </span>
                      )}
                      <button
                        onClick={handleUseDifferentAddress}
                        className="btn btn-sm flex items-center gap-1"
                      >
                        <FaEdit />
                        {isAddressChanged ? t("orderConfirmation.change") : t("orderConfirmation.useDifferent")}
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingAddress ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted block margin-bottom-xs">{t("orderConfirmation.streetAddress")}</label>
                      <input
                        type="text"
                        className="input"
                        value={orderAddress.street}
                        onChange={(e) => handleAddressChange("street", e.target.value)}
                        placeholder={t("orderConfirmation.streetAddress")}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block margin-bottom-xs">{t("orderConfirmation.city")}</label>
                      <input
                        type="text"
                        className="input"
                        value={orderAddress.city}
                        onChange={(e) => handleAddressChange("city", e.target.value)}
                        placeholder={t("orderConfirmation.city")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted block margin-bottom-xs">{t("orderConfirmation.zipCode")}</label>
                        <input
                          type="text"
                          className="input"
                          value={orderAddress.zipCode}
                          onChange={(e) => handleAddressChange("zipCode", e.target.value)}
                          placeholder={t("orderConfirmation.zipCode")}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted block margin-bottom-xs">{t("orderConfirmation.country")}</label>
                        <input
                          type="text"
                          className="input"
                          value={orderAddress.country}
                          onChange={(e) => handleAddressChange("country", e.target.value)}
                          placeholder={t("orderConfirmation.country")}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 margin-top-md">
                      <button
                        onClick={handleSaveAddress}
                        className="btn-primary btn-sm flex items-center gap-1"
                      >
                        <FaCheck />
                        {t("orderConfirmation.saveAddress")}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-sm flex items-center gap-1"
                      >
                        <FaTimes />
                        {t("orderConfirmation.cancel")}
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
                        {t("orderConfirmation.thisAddressDifferentFromProfile")}
                      </p>
                    )}
                    <div className="margin-top-sm">
                      <Link
                        to="/profile"
                        className="text-xs text-muted underline"
                      >
                        {t("orderConfirmation.updateDefaultAddressInProfile")}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="padding-y-md">
                    <p className="text-muted text-sm margin-bottom-md">
                      {t("orderConfirmation.pleaseCompleteShippingAddress")}
                    </p>
                    <button
                      onClick={handleUseDifferentAddress}
                      className="btn-primary btn-sm margin-bottom-sm"
                    >
                      {t("orderConfirmation.addAddressForThisOrder")}
                    </button>
                    <div className="margin-top-sm">
                      <Link to="/profile" className="text-xs text-muted underline">
                        {t("orderConfirmation.orUpdateDefaultAddressInProfile")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="card">
                <h2 className="section-title margin-bottom-md">{t("orderConfirmation.contactInformation")}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-muted" />
                    <span>{profileData.displayName || t("orderConfirmation.notSet")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-muted" />
                    <span>{profileData.email || t("orderConfirmation.notSet")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-muted" />
                    <span>{profileData.phone || t("orderConfirmation.notSet")}</span>
                  </div>
                  {!profileData.phone && (
                    <Link to="/profile" className="btn btn-sm margin-top-sm">
                      {t("orderConfirmation.addPhoneNumber")}
                    </Link>
                  )}
                </div>
              </div>

              {/* Payment Section - Placeholder for Tranzilla */}
              <div className="card">
                <h2 className="section-title margin-bottom-md">{t("orderConfirmation.payment")}</h2>
                <div className="padding-y-md">
                  <p className="text-muted text-sm margin-bottom-md">
                    {t("orderConfirmation.paymentIntegrationTranzilla")}
                  </p>
                  <div className="card padding-md" style={{ background: "#f3f4f6", borderColor: "#d1d5db" }}>
                    <p className="text-sm text-muted text-center">
                      {t("orderConfirmation.paymentGatewayComingSoon")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 margin-top-lg">
            <Link to="/cart" className="btn btn-secondary">
              {t("orderConfirmation.backToCart")}
            </Link>
            <button
              className="btn-primary"
              disabled={!hasCompleteAddress || !profileData.phone || sendingEmail}
              onClick={handleProceedToPayment}
            >
              {sendingEmail 
                ? t("orderConfirmation.sendingEmail")
                : !hasCompleteAddress || !profileData.phone
                ? t("orderConfirmation.completeInformationToContinue")
                : t("orderConfirmation.proceedToPayment")}
            </button>
          </div>

          {(!hasCompleteAddress || !profileData.phone) && (
            <div className="card padding-md margin-top-md" style={{ background: "#fef3c7", borderColor: "#f59e0b" }}>
              <p className="text-sm" style={{ color: "#92400e" }}>
                <strong>{t("orderConfirmation.pleaseCompleteFollowing")}</strong>{" "}
                {!hasCompleteAddress && (
                  <>
                    {isEditingAddress 
                      ? t("orderConfirmation.completeShippingAddressFields")
                      : t("orderConfirmation.addCompleteShippingAddress")}
                  </>
                )}
                {!profileData.phone && t("orderConfirmation.addPhoneNumberText")}
                {!hasCompleteAddress && !isEditingAddress && (
                  <button onClick={handleUseDifferentAddress} className="underline">
                    {t("orderConfirmation.addAddressForThisOrder")}
                  </button>
                )}
                {!profileData.phone && (
                  <>
                    {" "}{language === 'ar' ? 'أو' : language === 'he' ? 'או' : 'or'}{" "}
                    <Link to="/profile" className="underline">
                      {t("orderConfirmation.updateProfile")}
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

