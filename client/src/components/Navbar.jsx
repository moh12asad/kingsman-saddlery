import { useAuth } from "../context/AuthContext";
import { Link, NavLink } from "react-router-dom";
import { signInWithGoogle, signOutUser } from "../lib/firebase";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-xl tracking-tight">
          <span className="text-indigo-600">Book</span>Book
        </Link>
        <div className="flex items-center gap-6">
          <NavLink to="/" className={({ isActive }) => (isActive ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600")}>
            Home
          </NavLink>
            {!user ? (
                <NavLink
                    to="/signin"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:opacity-90"
                >
                    Sign in
                </NavLink>
            ) : (
                <div className="flex items-center gap-3">
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            className="w-8 h-8 rounded-full"
                            alt="avatar"
                        />
                    )}
                    <span className="text-sm">{user.displayName || user.email}</span>
                    <button
                        onClick={signOutUser}
                        className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
      </nav>
    </header>
  );
}
