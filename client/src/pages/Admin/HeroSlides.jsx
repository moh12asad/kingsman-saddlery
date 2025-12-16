import { useState, useEffect } from "react";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminHeroSlides() {
  const [heroSlides, setHeroSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slideForm, setSlideForm] = useState({
    image: "",
    title: "",
    subtitle: "",
    button1: "",
    button2: "",
    order: 0
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [slideError, setSlideError] = useState("");
  const [editingSlideId, setEditingSlideId] = useState(null);
  const [deletingSlideId, setDeletingSlideId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadHeroSlides() {
    try {
      setLoadingSlides(true);
      const res = await fetch(`${API}/api/hero-slides`);
      const data = await res.json();
      setHeroSlides(data.slides || []);
    } catch (err) {
      setSlideError(err.message || "Failed to load hero slides");
    } finally {
      setLoadingSlides(false);
    }
  }

  useEffect(() => {
    loadHeroSlides();
  }, []);

  async function uploadImage(file) {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    // Check if user is admin
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload hero slide images");
    }
    
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `hero/${Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    
    try {
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          uploadedAt: new Date().toISOString()
        }
      });
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Upload error:", error);
      if (error.code === 'storage/unauthorized') {
        throw new Error("You don't have permission to upload images. Please check Firebase Storage rules.");
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setSlideError("Image size must be less than 5MB");
      return;
    }
    
    setUploadingImage(true);
    setSlideError("");
    try {
      const publicUrl = await uploadImage(file);
      setSlideForm(prev => ({ ...prev, image: publicUrl }));
    } catch (err) {
      setSlideError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveSlide() {
    try {
      setSlideError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      if (!slideForm.image) {
        setSlideError("Image is required");
        return;
      }

      const payload = {
        image: slideForm.image,
        title: slideForm.title || "",
        subtitle: slideForm.subtitle || "",
        button1: slideForm.button1 || "",
        button2: slideForm.button2 || "",
        order: Number(slideForm.order) || 0
      };

      let res;
      if (editingSlideId) {
        res = await fetch(`${API}/api/hero-slides/${editingSlideId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API}/api/hero-slides`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to save slide" }));
        throw new Error(data.error || "Failed to save slide");
      }

      setSlideForm({ image: "", title: "", subtitle: "", button1: "", button2: "", order: 0 });
      setEditingSlideId(null);
      await loadHeroSlides();
    } catch (err) {
      setSlideError(err.message || "Unable to save slide");
    }
  }

  function editSlide(slide) {
    setSlideForm({
      image: slide.image || "",
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      button1: slide.button1 || "",
      button2: slide.button2 || "",
      order: slide.order || 0
    });
    setEditingSlideId(slide.id);
    setSlideError("");
  }

  function cancelEdit() {
    setSlideForm({ image: "", title: "", subtitle: "", button1: "", button2: "", order: 0 });
    setEditingSlideId(null);
    setSlideError("");
  }

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
      <div className="card top:7.5rem">
        <div className="section-title">Manage Hero Carousel Slides</div>
        <p className="text-gray-600 text-sm mb-4">
          Upload and manage the sliding images that appear on the homepage carousel.
        </p>

        {/* Create/Edit Form */}
        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
              <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-1">📐 Recommended Image Size:</p>
                <p className="text-sm text-blue-700">
                  <strong>1920 × 800 pixels</strong> (2.4:1 aspect ratio) for best results across all devices.
                  <br />
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Image URL"
                  value={slideForm.image}
                  onChange={e => setSlideForm({ ...slideForm, image: e.target.value })}
                />
                <label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50 transition text-sm whitespace-nowrap">
                  <span>{uploadingImage ? "Uploading..." : "Upload"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploadingImage} />
                </label>
              </div>
            </div>
            <input
              className="input"
              placeholder="Title"
              value={slideForm.title}
              onChange={e => setSlideForm({ ...slideForm, title: e.target.value })}
            />
            <input
              className="input"
              type="number"
              placeholder="Order (0, 1, 2...)"
              value={slideForm.order || ""}
              onChange={e => setSlideForm({ ...slideForm, order: Number(e.target.value) || 0 })}
            />
            <input
              className="input md:col-span-2"
              placeholder="Subtitle"
              value={slideForm.subtitle}
              onChange={e => setSlideForm({ ...slideForm, subtitle: e.target.value })}
            />
            <input
              className="input"
              placeholder="Button 1 Text"
              value={slideForm.button1}
              onChange={e => setSlideForm({ ...slideForm, button1: e.target.value })}
            />
            <input
              className="input"
              placeholder="Button 2 Text"
              value={slideForm.button2}
              onChange={e => setSlideForm({ ...slideForm, button2: e.target.value })}
            />
          </div>
          {slideForm.image && (
            <div className="mt-2">
              <div className="text-sm text-gray-600 mb-2">Preview:</div>
              <img src={slideForm.image} alt="preview" className="w-full max-w-md h-48 object-cover rounded-lg border shadow-sm" />
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={saveSlide}
              disabled={!slideForm.image}
            >
              {editingSlideId ? "Update Slide" : "Create Slide"}
            </button>
            {editingSlideId && (
              <button
                className="btn btn-sm"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
          {slideError && <p className="text-sm text-red-600">{slideError}</p>}
        </div>

        {/* Slides List */}
        <div>
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
                    <div className="font-medium">{slide.title || "No title"}</div>
                    <div className="text-sm text-gray-600">{slide.subtitle || "No subtitle"}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Buttons: {slide.button1 || "None"} / {slide.button2 || "None"} | Order: {slide.order || 0}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => editSlide(slide)}
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
    </div>
  );
}







