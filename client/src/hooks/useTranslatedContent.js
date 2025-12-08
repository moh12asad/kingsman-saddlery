import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";

/**
 * Hook to get translated content from multilingual objects
 * 
 * Automatically uses the current language from LanguageContext.
 * 
 * @param {object|string} content - Content object with language keys or plain string
 * @returns {string} Translated content
 * 
 * @example
 * function ProductCard({ product }) {
 *   const name = useTranslatedContent(product.name);
 *   const description = useTranslatedContent(product.description);
 *   
 *   return (
 *     <div>
 *       <h3>{name}</h3>
 *       <p>{description}</p>
 *     </div>
 *   );
 * }
 */
export function useTranslatedContent(content) {
  const { language } = useLanguage();
  return getTranslatedContent(content, language);
}





