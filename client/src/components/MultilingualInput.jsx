import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

/**
 * Multilingual Input Component
 * Displays a field with tabs for English, Arabic, and Hebrew
 */
export default function MultilingualInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  rows = 1,
  required = false,
  className = "",
  showLabel = true
}) {
  const { t, language } = useLanguage();
  const [activeLang, setActiveLang] = useState("en");
  
  // Handle both old format (string) and new format (object)
  const isMultilingual = value && typeof value === 'object' && !Array.isArray(value);
  
  // Get current value based on active language
  const currentValue = isMultilingual 
    ? (value[activeLang] || "")
    : (activeLang === "en" ? (value || "") : "");
  
  // Update value for current language
  const handleChange = (newValue) => {
    if (isMultilingual) {
      // Update existing multilingual object
      onChange({
        ...value,
        [activeLang]: newValue
      });
    } else {
      // Convert from string to multilingual object
      if (activeLang === "en") {
        onChange({
          en: newValue,
          ar: "",
          he: ""
        });
      } else {
        onChange({
          en: value || "",
          [activeLang]: newValue
        });
      }
    }
  };
  
  const InputComponent = rows > 1 ? "textarea" : "input";
  const inputProps = rows > 1 
    ? { rows, className: `input ${className}` }
    : { type, className: `input ${className}` };
  
  return (
    <div className="multilingual-input-wrapper">
      {showLabel && label && (
        <label className="form-label block mb-2 font-medium text-sm">
          {label}
        </label>
      )}
      
      {/* Language Tabs */}
      <div className="flex gap-1 mb-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveLang("en")}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            activeLang === "en"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setActiveLang("ar")}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            activeLang === "ar"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          العربية
        </button>
        <button
          type="button"
          onClick={() => setActiveLang("he")}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            activeLang === "he"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          עברית
        </button>
      </div>
      
      {/* Input Field */}
      <InputComponent
        {...inputProps}
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || `${label || "Enter text"} (${activeLang.toUpperCase()})`}
        required={required && activeLang === "en"}
      />
      
      {/* Preview of other languages */}
      {(isMultilingual || activeLang !== "en") && (
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          {activeLang !== "en" && value?.en && (
            <div>
              <span className="font-medium">EN:</span> {value.en.substring(0, 50)}
              {value.en.length > 50 && "..."}
            </div>
          )}
          {activeLang !== "ar" && value?.ar && (
            <div>
              <span className="font-medium">AR:</span> {value.ar.substring(0, 50)}
              {value.ar.length > 50 && "..."}
            </div>
          )}
          {activeLang !== "he" && value?.he && (
            <div>
              <span className="font-medium">HE:</span> {value.he.substring(0, 50)}
              {value.he.length > 50 && "..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

