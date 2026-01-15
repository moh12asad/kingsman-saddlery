import HeroCarousel from "../components/HeroCarousel";
import CategoriesGrid from "../components/CategoriesGrid";
import PromotionalBanner from "../components/PromotionalBanner";
import BrandsCarousel from "../components/BrandsCarousel";
import ProductsOnSale from "../components/ProductsOnSale";
import BestSellers from "../components/BestSellers";
import SuggestedProducts from "../components/SuggestedProducts";
import NewProducts from "../components/NewProducts";

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

      {/* Products on Sale */}
      <ProductsOnSale />

      {/* Best Sellers */}
      <BestSellers />

      {/* Suggested Products */}
      <SuggestedProducts />

      {/* New Products */}
      <NewProducts />

    </main>
  );
}
