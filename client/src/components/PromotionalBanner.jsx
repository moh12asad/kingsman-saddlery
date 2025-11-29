export default function PromotionalBanner({ title = "Discover Amazing Deals", subtitle = "Shop our exclusive sale collection and save on premium equestrian equipment" }) {
  return (
    <div className="promotional-banner">
      <div className="promotional-banner-content">
        <h2 className="promotional-banner-title">{title}</h2>
        <p className="promotional-banner-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}



