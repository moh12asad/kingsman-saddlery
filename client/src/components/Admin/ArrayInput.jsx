import { useState } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";

/**
 * Component for managing an array of string values (e.g., sizes, colors)
 * Allows adding items one by one with an input field and remove buttons
 */
export default function ArrayInput({ 
  label, 
  placeholder, 
  value = [], 
  onChange, 
  helpText 
}) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const handleRemove = (index) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <label className="form-label">{label}</label>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1 }}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim() || value.includes(inputValue.trim())}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" }}
        >
          <FaPlus />
          Add
        </button>
      </div>
      
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {value.map((item, index) => (
            <span
              key={index}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.25rem 0.75rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "9999px",
                fontSize: "0.875rem"
              }}
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                style={{
                  color: "#6b7280",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  display: "flex",
                  alignItems: "center"
                }}
                onMouseEnter={(e) => e.target.style.color = "#dc2626"}
                onMouseLeave={(e) => e.target.style.color = "#6b7280"}
                aria-label={`Remove ${item}`}
              >
                <FaTimes size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      
      {helpText && (
        <small className="text-muted">{helpText}</small>
      )}
    </div>
  );
}

