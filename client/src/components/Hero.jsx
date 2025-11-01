export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-radial-glow">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
                Manage Your Business Smarter <span className="text-indigo-600">Bookbook</span>
            </h1>
            <p className="mt-5 text-gray-600 text-lg leading-relaxed">
              A clean Node + React starter with Google Sign-In, protected Admin Panel, and Firestore integration. Edit it freely and add your own collections.
            </p>
            <div className="mt-8 flex gap-3">
              <a href="/admin" className="px-5 py-3 rounded-xl bg-indigo-600 text-white hover:opacity-90">Go to Admin</a>
              <a href="https://firebase.google.com/docs" target="_blank" className="px-5 py-3 rounded-xl border hover:bg-gray-50">Firebase Docs</a>
            </div>
          </div>
          <div>
            <div className="glass p-8 shadow-2xl">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-gradient-to-br from-indigo-500/30 to-emerald-500/30 border border-white/20"></div>
                ))}
              </div>
              <p className="mt-5 text-sm text-gray-500">
                Beautiful, minimal design with subtle gradients and glassmorphism.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
