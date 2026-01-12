import { createContext, useContext, useState, useEffect, useMemo } from "react";

const CurrencyContext = createContext({
  currency: "ILS",
  currencySymbol: "₪",
  exchangeRate: 1,
  country: null,
  isLoading: true,
  formatPrice: (price) => `₪${price.toFixed(2)}`,
  convertPrice: (price) => price,
});

// Map countries to currencies
const countryToCurrency = {
  // Israel
  IL: "ILS",
  // European countries
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR",
  DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR",
  LU: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR",
  ES: "EUR", AD: "EUR", MC: "EUR", SM: "EUR", VA: "EUR",
  // United States
  US: "USD",
  // United Kingdom
  GB: "GBP",
  // Canada
  CA: "CAD",
  // Australia
  AU: "AUD",
  // Japan
  JP: "JPY",
  // China
  CN: "CNY",
  // India
  IN: "INR",
  // Brazil
  BR: "BRL",
  // Mexico
  MX: "MXN",
  // Russia
  RU: "RUB",
  // South Korea
  KR: "KRW",
  // Turkey
  TR: "TRY",
  // Saudi Arabia
  SA: "SAR",
  // UAE
  AE: "AED",
  // South Africa
  ZA: "ZAR",
  // Switzerland
  CH: "CHF",
  // Norway
  NO: "NOK",
  // Sweden
  SE: "SEK",
  // Denmark
  DK: "DKK",
  // Poland
  PL: "PLN",
};

// Currency symbols
const currencySymbols = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  ILS: "₪",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  MXN: "$",
  RUB: "₽",
  KRW: "₩",
  TRY: "₺",
  SAR: "﷼",
  AED: "د.إ",
  ZAR: "R",
  CHF: "CHF",
  NOK: "kr",
  SEK: "kr",
  DKK: "kr",
  PLN: "zł",
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState("ILS");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [country, setCountry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Base currency is ILS (products are stored in ILS)
  const BASE_CURRENCY = "ILS";

  // Detect user location and set currency
  useEffect(() => {
    async function detectLocationAndCurrency() {
      try {
        setIsLoading(true);
        
        // Try to get country from IP geolocation
        let detectedCountry = null;
        
        try {
          // Using ipapi.co (free tier: 1000 requests/day)
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000)
          );
          
          const ipResponse = await Promise.race([
            fetch("https://ipapi.co/json/"),
            timeoutPromise
          ]);
          
          // Check for rate limit (429) or other errors
          if (ipResponse.status === 429) {
            console.warn("ipapi.co rate limit reached, trying fallback");
            throw new Error("Rate limit");
          }
          
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            detectedCountry = ipData.country_code;
            setCountry(ipData.country_name || null);
          } else {
            throw new Error(`ipapi.co returned status ${ipResponse.status}`);
          }
        } catch (ipError) {
          console.warn("IP geolocation failed, trying fallback:", ipError);
          
          // Fallback: try ip-api.com (using HTTPS to avoid mixed content errors)
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 5000)
            );
            
            const fallbackResponse = await Promise.race([
              fetch("https://ip-api.com/json/?fields=countryCode,country"),
              timeoutPromise
            ]);
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              detectedCountry = fallbackData.countryCode;
              setCountry(fallbackData.country || null);
            }
          } catch (fallbackError) {
            console.warn("Fallback geolocation failed:", fallbackError);
          }
        }

        // Determine currency based on country
        let targetCurrency = BASE_CURRENCY; // Default to ILS (store's base currency)
        if (detectedCountry && countryToCurrency[detectedCountry]) {
          targetCurrency = countryToCurrency[detectedCountry];
        } else {
          // Fallback: try browser locale
          const browserLocale = navigator.language || navigator.userLanguage;
          if (browserLocale) {
            const localeParts = browserLocale.split("-");
            const localeCountry = localeParts[1]?.toUpperCase();
            if (localeCountry && countryToCurrency[localeCountry]) {
              targetCurrency = countryToCurrency[localeCountry];
            }
          }
        }

        setCurrency(targetCurrency);

        // Fetch exchange rate if not ILS (base currency)
        if (targetCurrency !== BASE_CURRENCY) {
          try {
            // Using exchangerate-api.com (free tier: 1500 requests/month)
            // Since API uses USD as base, we need to calculate ILS to target currency
            // Formula: ILS_to_Target = USD_to_Target / USD_to_ILS
            const rateResponse = await fetch(
              `https://api.exchangerate-api.com/v4/latest/USD`
            );
            
            if (rateResponse.ok) {
              const rateData = await rateResponse.json();
              const usdToTarget = rateData.rates[targetCurrency];
              const usdToIls = rateData.rates[BASE_CURRENCY];
              
              if (usdToTarget && usdToIls) {
                // Calculate ILS to target currency rate
                const ilsToTarget = usdToTarget / usdToIls;
                setExchangeRate(ilsToTarget);
              } else {
                console.warn(`Exchange rate not found for ${targetCurrency} or ${BASE_CURRENCY}`);
                setExchangeRate(1);
              }
            } else {
              console.warn("Failed to fetch exchange rates");
              setExchangeRate(1);
            }
          } catch (rateError) {
            console.warn("Error fetching exchange rates:", rateError);
            setExchangeRate(1);
          }
        } else {
          // User is in Israel or currency is ILS, no conversion needed
          setExchangeRate(1);
        }
      } catch (error) {
        console.error("Error detecting location/currency:", error);
        // Default to ILS on error (store's base currency)
        setCurrency(BASE_CURRENCY);
        setExchangeRate(1);
      } finally {
        setIsLoading(false);
      }
    }

    detectLocationAndCurrency();
  }, []);

  // Format price with currency symbol
  // price is in ILS (base currency), converts to user's currency
  const formatPrice = useMemo(() => {
    return (price) => {
      if (typeof price !== "number" || isNaN(price)) {
        return "₪0.00";
      }
      
      // Convert from ILS (base) to user's currency
      const convertedPrice = price * exchangeRate;
      const symbol = currencySymbols[currency] || currency;
      
      // Special formatting for some currencies
      if (currency === "JPY" || currency === "KRW") {
        // No decimal places for JPY and KRW
        return `${symbol}${Math.round(convertedPrice).toLocaleString()}`;
      }
      
      return `${symbol}${convertedPrice.toFixed(2)}`;
    };
  }, [currency, exchangeRate]);

  // Convert price without formatting
  // price is in ILS (base currency), converts to user's currency
  const convertPrice = useMemo(() => {
    return (price) => {
      if (typeof price !== "number" || isNaN(price)) {
        return 0;
      }
      // Convert from ILS (base) to user's currency
      return price * exchangeRate;
    };
  }, [exchangeRate]);

  const value = useMemo(
    () => ({
      currency,
      currencySymbol: currencySymbols[currency] || currency,
      exchangeRate,
      country,
      isLoading,
      formatPrice,
      convertPrice,
    }),
    [currency, exchangeRate, country, isLoading, formatPrice, convertPrice]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

