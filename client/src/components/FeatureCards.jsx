const features = [
  { title: "Google SSO", desc: "Secure sign-in via Firebase Authentication." },
  { title: "Protected Admin", desc: "Only allowed emails can access." },
  { title: "Firestore Ready", desc: "Add collections/tables later with zero friction." },
  { title: "Node API", desc: "Verify tokens server-side for secure endpoints." }
];

export default function FeatureCards() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold mb-6">What’s Inside</h2>
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
