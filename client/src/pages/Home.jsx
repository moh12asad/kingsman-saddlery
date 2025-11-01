import Hero from "../components/Hero";
import FeatureCards from "../components/FeatureCards";

export default function Home() {
  return (
    <main>
      <Hero />
      <FeatureCards />
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="glass p-8">
          <h3 className="text-xl font-semibold">Next steps</h3>
          <ul className="list-disc ml-5 mt-3 text-gray-700 space-y-1">
            <li>Update <code>VITE_ADMIN_EMAILS</code> to your Google account.</li>
            <li>Add Firestore collections & security rules.</li>
            <li>Extend the Admin Panel with your own forms and dashboards.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
