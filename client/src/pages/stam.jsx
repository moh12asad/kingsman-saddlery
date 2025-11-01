import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable,getDownloadURL} from "firebase/storage";


export default function CreateOwner() {
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    phone: "",
    business: "",
    logoUrl: "",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // handle form input changes
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleFile(e) {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  // handle form submit
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgress(0);

    try {
    const ownerRef = await addDoc(collection(db, "owners"), { //remove the const ownerRef if not needed
        ...formData,
        logoUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

    if (logoFile) {
        if (!logoFile.type.startsWith("image/")) {
          throw new Error("Logo must be an image file.");
        }
        const ext = (logoFile.name.split(".").pop() || "png").toLowerCase();
        const storagePath = `owners/${ownerRef.id}/logo.${ext}`;
        const storageRef = ref(storage, storagePath);
        
        console.log("Uploading logo to:", storagePath);
        console.log("File details:", logoFile);
        const task = uploadBytesResumable(storageRef, logoFile, {
          contentType: logoFile.type,
        });

        await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round(
                (snap.bytesTransferred / snap.totalBytes) * 100
              );
              setProgress(pct);
            },
            reject,
            resolve
          );
        });

        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "owners", ownerRef.id), {
          logoUrl: url,
          updatedAt: serverTimestamp(),
        });
      }

      setSuccessMsg("Owner added successfully!");
      setFormData({ name: "", city: "", phone: "", business: "" });
    } catch (err) {
      console.error("Error adding owner:", err);
      setErrorMsg("Failed to add owner. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Create New Owner</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block font-medium">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block font-medium">Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block font-medium">Business Name</label>
          <input
            type="text"
            name="business"
            value={formData.business}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

        {/* Logo upload */}
        <div>
          <label className="block font-medium">Logo (image)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="mt-1"
          />
          {preview && (
            <img
              src={preview}
              alt="preview"
              className="mt-3 h-20 w-20 object-cover rounded-lg border"
            />
          )}
          {progress > 0 && progress < 100 && (
            <div className="mt-2 text-sm text-gray-600">
              Uploading… {progress}%
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Create Owner"}
        </button>
      </form>

      {successMsg && <p className="mt-4 text-green-600">{successMsg}</p>}
      {errorMsg && <p className="mt-4 text-red-600">{errorMsg}</p>}
    </div>
  );
}
