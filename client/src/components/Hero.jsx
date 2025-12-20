export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-radial-glow" style={{ paddingTop: '1rem' }}>
      <div className="max-w-6xl mx-auto px-4 pt-12 md:pt-24 pb-12 md:pb-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Premium Horse Tack & Equipment
              <span className="block" style={{ color: 'var(--brand)' }}>Kingsman Saddlery</span>
            </h1>
            <p className="mt-5 text-gray-600 text-lg leading-relaxed">
              Shop quality saddles, bridles, blankets, and grooming essentials. Built for
              comfort, durability, and performance in the arena and on the trail.
            </p>
            <div className="mt-8 flex gap-3">
              <a href="#shop" className="px-5 py-3 rounded-xl border-2 font-bold transition-all" style={{ borderColor: '#000000', color: '#000000', background: '#ffffff' }} onMouseEnter={(e) => { e.target.style.color = 'var(--brand)'; e.target.style.borderColor = 'var(--brand)'; }} onMouseLeave={(e) => { e.target.style.color = '#000000'; e.target.style.borderColor = '#000000'; }}>Shop Saddles</a>
              <a href="/signin" className="px-5 py-3 rounded-xl border-2 font-bold transition-all" style={{ borderColor: '#000000', color: '#000000', background: '#ffffff' }} onMouseEnter={(e) => { e.target.style.color = 'var(--brand)'; e.target.style.borderColor = 'var(--brand)'; }} onMouseLeave={(e) => { e.target.style.color = '#000000'; e.target.style.borderColor = '#000000'; }}>Sign in</a>
            </div>
          </div>
          <div>
            <div className="glass p-8 shadow-2xl">
              <div className="grid grid-cols-3 gap-4">
                {[
                  "🐴","🪶","🪙","🧽","🧼","🧵"
                ].map((icon, i) => (
                  <div key={i} className="h-24 rounded-xl border border-white/20 grid place-items-center text-3xl" style={{ background: 'linear-gradient(to bottom right, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3))' }}>
                    <span aria-hidden>{icon}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm text-gray-500">
                Thoughtfully curated gear for horse and rider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
