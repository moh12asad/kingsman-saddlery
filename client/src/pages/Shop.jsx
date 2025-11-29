import HeroCarousel from "../components/HeroCarousel";
import CategoriesGrid from "../components/CategoriesGrid";
import PromotionalBanner from "../components/PromotionalBanner";
import ProductsTabs from "../components/ProductsTabs";
import BrandsCarousel from "../components/BrandsCarousel";
import BestSellers from "../components/BestSellers";

export default function Shop() {

  return (
    <main className="shop-page">
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Categories Grid */}
      <CategoriesGrid />

      {/* Promotional Banner */}
      <PromotionalBanner />

      {/* Brands Carousel */}
      <BrandsCarousel />

      {/* Products Tabs (Suggested, Sales, New) */}
      <ProductsTabs />

      {/* Best Sellers */}
      <BestSellers />

    </main>
  );
}
