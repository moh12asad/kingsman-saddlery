import { useState, useEffect } from "react";

/**
 * Multi-language input component for admin forms
 * Supports English, Arabic, and Hebrew
 */
export default function MultiLanguageInput({ 
  label, 
  value, 
  onChange, 
  placeholder = "", 
  required = false,
  type = "input", // "input" or "textarea"
  rows = 4,
  className = ""
}) {
  // Initialize translations object from value (could be string or object)
  const getInitialTranslations = () => {
    if (typeof value === 'string') {
      return { en: value, ar: "", he: "" };
    }
    if (typeof value === 'object' && value !== null) {
      return {
        en: value.en || "",
        ar: value.ar || "",
        he: value.he || ""
      };
    }
    return { en: "", ar: "", he: "" };
  };

  const [translations, setTranslations] = useState(getInitialTranslations());

  // Update translations when value prop changes
  useEffect(() => {
    const newTranslations = getInitialTranslations();
    setTranslations(newTranslations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (lang, newValue) => {
    const updated = { ...translations, [lang]: newValue };
    setTranslations(updated);
    // Call onChange with the translation object
    onChange(updated);
  };

  const languages = [
    { code: 'en', label: 'English', dir: 'ltr' },
    { code: 'ar', label: 'العربية', dir: 'rtl' },
    { code: 'he', label: 'עברית', dir: 'rtl' }
  ];

  return (
    <div className={`form-group ${className}`}>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="space-y-3">
        {languages.map((lang) => {
          const InputComponent = type === "textarea" ? "textarea" : "input";
          const inputProps = {
            className: "input",
            placeholder: `${placeholder} (${lang.label})`,
            value: translations[lang.code] || "",
            onChange: (e) => handleChange(lang.code, e.target.value),
            dir: lang.dir,
            required: required && lang.code === 'en', // Only English is required
            ...(type === "textarea" && { rows })
          };

          return (
            <div key={lang.code} className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-600">{lang.label}:</span>
              </div>
              <InputComponent {...inputProps} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

