import { useTranslatedContent } from "../hooks/useTranslatedContent";

/**
 * Helper component to display translated content in table cells
 */
export default function ProductTableCell({ content, fallback = "-" }) {
  const translated = useTranslatedContent(content);
  return <>{translated || fallback}</>;
}




