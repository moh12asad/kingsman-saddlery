import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminHeroSlides() {
  const navigate = useNavigate();
  const [heroSlides, setHeroSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slideError, setSlideError] = useState("");
  const [deletingSlideId, setDeletingSlideId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadHeroSlides() {
    try {
      setLoadingSlides(true);
      setSlideError(""); // Clear any previous errors
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");
      
      // Fetch with all languages for admin using the /all endpoint
      const res = await fetch(`${API}/api/hero-slides/all?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to load hero slides" }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      setHeroSlides(data.slides || []);
    } catch (err) {
      // Show error instead of silently failing
      setSlideError(err.message || "Failed to load hero slides. Please refresh the page.");
      setHeroSlides([]); // Clear slides to avoid showing incomplete data
    } finally {
      setLoadingSlides(false);
    }
  }
  
  useEffect(() => {
    loadHeroSlides();
  }, []);

  async function deleteSlide(id) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingSlideId(id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API}/api/hero-slides/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      setConfirmDelete(null);
      await loadHeroSlides();
    } catch (err) {
      setSlideError(err.message || "Failed to delete slide");
    } finally {
      setDeletingSlideId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Hero Carousel Slides</h1>
          <p className="text-gray-600 text-sm mt-1">
            Upload and manage the sliding images that appear on the homepage carousel.
          </p>
        </div>
        <button
          className="btn btn-cta"
          onClick={() => navigate("/admin/hero-slides/create")}
        >
          + Add Slide
        </button>
      </div>

      {slideError && (
        <div className="card bg-red-50 border-2 border-red-200 p-4">
          <p className="text-sm text-red-600">{slideError}</p>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Current Slides ({heroSlides.length})</h3>
          {loadingSlides ? (
            <p className="text-gray-500">Loading slides...</p>
          ) : heroSlides.length === 0 ? (
            <p className="text-gray-500">No slides yet. Create your first slide above!</p>
          ) : (
            <div className="space-y-4">
              {heroSlides.map(slide => (
                <div key={slide.id} className="border rounded-lg p-4 flex gap-4 items-start">
                  <img
                    src={slide.image}
                    alt={slide.title || "Slide"}
                    className="w-32 h-20 object-cover rounded border"
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {typeof slide.title === 'string' ? slide.title : (slide.title?.en || slide.title?.ar || slide.title?.he || "No title")}
                    </div>
                    <div className="text-sm text-gray-600">
                      {typeof slide.subtitle === 'string' ? slide.subtitle : (slide.subtitle?.en || slide.subtitle?.ar || slide.subtitle?.he || "No subtitle")}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Buttons: {typeof slide.button1 === 'string' ? slide.button1 : (slide.button1?.en || slide.button1?.ar || slide.button1?.he || "None")} / {typeof slide.button2 === 'string' ? slide.button2 : (slide.button2?.en || slide.button2?.ar || slide.button2?.he || "None")} | Order: {slide.order || 0}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/admin/hero-slides/edit/${slide.id}`)}
                      disabled={deletingSlideId === slide.id}
                    >
                      Edit
                    </button>
                    {confirmDelete === slide.id ? (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteSlide(slide.id)}
                          disabled={deletingSlideId === slide.id}
                        >
                          {deletingSlideId === slide.id ? "..." : "Confirm"}
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmDelete(slide.id)}
                        disabled={deletingSlideId === slide.id}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}







