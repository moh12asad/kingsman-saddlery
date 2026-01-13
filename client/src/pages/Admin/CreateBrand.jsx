import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CreateBrand() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    logo: "",
  });

  async function uploadImage(file) {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload brand logos");
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 5MB");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storageRef = ref(storage, `brands/${Date.now()}_${safeName}`);
    
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
        throw new Error("Storage permission denied. Please update Firebase Storage rules.");
      } else if (error.code === 'storage/canceled') {
        throw new Error("Upload was canceled");
      } else if (error.code) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw error;
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    setError("");
    try {
      const publicUrl = await uploadImage(file);
      setForm(prev => ({ ...prev, logo: publicUrl }));
    } catch (err) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function createBrand(e) {
    e?.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      if (!form.name || form.name.trim() === "") {
        throw new Error("Brand name is required");
      }

      if (!form.logo || form.logo.trim() === "") {
        throw new Error("Brand logo is required");
      }

      const res = await fetch(`${API}/api/brands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create brand");
      }

      navigate("/admin/brands");
    } catch (err) {
      setError(err.message || "Failed to create brand");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Brand</h1>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/admin/brands")}
        >
          Cancel
        </button>
      </div>

      <form className="card space-y-4" onSubmit={createBrand}>
        <div className="form-group">
          <label htmlFor="brand-name">Brand Name *</label>
          <input
            id="brand-name"
            type="text"
            className="input"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter brand name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="brand-logo">Brand Logo *</label>
            <label className="btn btn-cta btn-sm inline-flex items-center gap-2 cursor-pointer">
              <span>{uploadingImage ? "Uploading..." : "Upload Logo"}</span>
              <input
                id="brand-logo"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          {uploadingImage && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
          {form.logo && (
            <div className="mt-2">
              <img
                src={form.logo}
                alt="Brand logo preview"
                className="max-w-[200px] max-h-[100px] object-contain border-2 border-gray-300 rounded"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            className="btn btn-cta"
            disabled={uploadingImage || !form.name || !form.logo || submitting}
          >
            {submitting ? "Creating..." : "Create Brand"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/admin/brands")}
            disabled={submitting || uploadingImage}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

