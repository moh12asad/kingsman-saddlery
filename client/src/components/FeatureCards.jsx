const features = [
  { title: "Saddles", desc: "Dressage, jumping, and trail saddles for every rider." },
  { title: "Bridles & Bits", desc: "Quality leatherwork and ergonomic designs for comfort." },
  { title: "Blankets & Pads", desc: "Protective layers for stable, turnout, and training." },
  { title: "Care & Grooming", desc: "Brushes, shampoos, conditioners, and daily essentials." }
];

export default function FeatureCards() {
  return (
    <section id="shop" className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold mb-6">Shop by Category</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <div key={i} className="glass p-5 shadow">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-gray-600 mt-2 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
