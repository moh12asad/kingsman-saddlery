import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="container-main text-center px-4">
        <div className="card max-w-2xl mx-auto p-12">
          <div className="mb-8">
            <h1 className="text-9xl font-bold mb-4" style={{ color: 'var(--brand)' }}>
              404
            </h1>
            <h2 className="text-3xl font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Page Not Found
            </h2>
            <p className="text-lg mb-6" style={{ color: 'var(--muted)' }}>
              The page you're looking for seems to have galloped away. 
              Let's get you back on track.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/" 
              className="btn"
              style={{ 
                backgroundColor: 'var(--brand)', 
                color: 'var(--text)',
                borderColor: 'var(--brand)'
              }}
            >
              Go Home
            </Link>
            <Link 
              to="/shop" 
              className="btn"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
