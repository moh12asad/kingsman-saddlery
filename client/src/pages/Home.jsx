import Hero from "../components/Hero";
import FeatureCards from "../components/FeatureCards";
import CategoriesGrid from "../components/CategoriesGrid";

export default function Home() {
  return (
    <main>
      <Hero />
      <CategoriesGrid />
      <FeatureCards />
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="glass p-8">
          <h3 className="text-xl font-semibold">Featured Collections</h3>
          <ul className="list-disc ml-5 mt-3 text-gray-700 space-y-1">
            <li><a href="#shop" style={{ color: 'var(--brand)' }} className="hover:underline">Premium Leather Saddles</a></li>
            <li><a href="#shop" style={{ color: 'var(--brand)' }} className="hover:underline">Bridles, Reins & Bits</a></li>
            <li><a href="#shop" style={{ color: 'var(--brand)' }} className="hover:underline">Blankets, Pads & Wraps</a></li>
            <li><a href="#shop" style={{ color: 'var(--brand)' }} className="hover:underline">Grooming & Stable Care</a></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
