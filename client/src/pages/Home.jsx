import Hero from "../components/Hero";
import FeatureCards from "../components/FeatureCards";
import CategoriesGrid from "../components/CategoriesGrid";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  
  return (
    <main>
      <Hero />
      <CategoriesGrid />
      <FeatureCards />
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="glass p-8">
          <h3 className="text-xl font-semibold">{t("home.featuredCollections")}</h3>
          <ul className="list-disc ml-5 mt-3 text-gray-700 space-y-1">
            <li><a href="#shop" className="text-indigo-600 hover:underline">{t("home.premiumLeatherSaddles")}</a></li>
            <li><a href="#shop" className="text-indigo-600 hover:underline">{t("home.bridlesReinsBits")}</a></li>
            <li><a href="#shop" className="text-indigo-600 hover:underline">{t("home.blanketsPadsWraps")}</a></li>
            <li><a href="#shop" className="text-indigo-600 hover:underline">{t("home.groomingStableCare")}</a></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
