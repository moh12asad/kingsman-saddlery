import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { FaEnvelope, FaPhone, FaUser, FaCalendar, FaCheckCircle, FaTimesCircle, FaEye, FaTrash } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_OPTIONS = {
  new: "New",
  replied: "Replied",
};

export default function ContactSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, statusFilter, searchQuery]);

  async function loadSubmissions() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/contact/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load contact submissions");
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error("Error loading submissions:", err);
      setError(err.message || "Failed to load contact submissions");
    } finally {
      setLoading(false);
    }
  }

  function filterSubmissions() {
    let filtered = submissions;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.name?.toLowerCase().includes(query) ||
          sub.email?.toLowerCase().includes(query) ||
          sub.subject?.toLowerCase().includes(query) ||
          sub.message?.toLowerCase().includes(query)
      );
    }

    // Sort by newest first
    filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    setFilteredSubmissions(filtered);
  }

  async function updateStatus(submissionId, newStatus) {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/contact/submissions/${submissionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      // Reload submissions
      await loadSubmissions();
      
      // Update selected submission if it's the one being updated
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert(err.message || "Failed to update status");
    }
  }

  async function deleteSubmission(submissionId) {
    if (!confirm("Are you sure you want to delete this submission? This action cannot be undone.")) {
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/contact/submissions/${submissionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete submission");
      }

      // Reload submissions
      await loadSubmissions();
      
      // Close modal if deleted submission was selected
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission(null);
      }
    } catch (err) {
      console.error("Error deleting submission:", err);
      alert(err.message || "Failed to delete submission");
    }
  }

  function formatDate(date) {
    if (!date) return "N/A";
    try {
      let d;
      
      // Handle Firestore Timestamp object (if using Firestore SDK on client)
      if (date && typeof date.toDate === "function") {
        d = date.toDate();
      }
      // Handle serialized Firestore timestamp from backend (has _seconds property)
      else if (date && typeof date === "object" && date._seconds) {
        d = new Date(date._seconds * 1000);
      }
      // Handle serialized Firestore timestamp (has seconds property)
      else if (date && typeof date === "object" && date.seconds) {
        d = new Date(date.seconds * 1000);
      }
      // Handle ISO string or timestamp number
      else if (typeof date === "string" || typeof date === "number") {
        d = new Date(date);
      }
      // Fallback
      else {
        d = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        return "Invalid Date";
      }
      
      return d.toLocaleString();
    } catch (err) {
      console.error("Error formatting date:", err, date);
      return "N/A";
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case "new":
        return "badge bg-blue-100 text-blue-800";
      case "replied":
        return "badge bg-green-100 text-green-800";
      default:
        return "badge bg-gray-100 text-gray-800";
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <div className="text-muted">Loading contact submissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <div className="flex-row flex-align-center flex-justify-between">
        <h2 className="section-title">Contact Submissions</h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadSubmissions}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="card">
          <p className="form-error">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid-form grid-form-3">
          <div className="grid-col-span-full md:col-span-1">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="replied">Replied</option>
              </select>
            </div>
          </div>
          <div className="grid-col-span-full md:col-span-2">
            <div className="form-group">
              <label className="form-label">Search</label>
              <input
                className="input"
                type="text"
                placeholder="Search by name, email, subject, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="card">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center padding-y-lg">
            <p className="text-muted">No contact submissions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem" }}>Date</th>
                  <th style={{ padding: "1rem" }}>Contact</th>
                  <th style={{ padding: "1rem" }}>Subject</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className={submission.status === "new" ? "bg-blue-50" : ""}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <td style={{ padding: "1rem" }}>
                      <div className="flex-row flex-align-center flex-gap-sm">
                        <FaCalendar className="text-muted" />
                        <span className="text-sm">{formatDate(submission.createdAt)}</span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div className="flex-col flex-gap-xs">
                        <div className="flex-row flex-align-center flex-gap-sm">
                          <FaUser className="text-muted" />
                          <strong>{submission.name}</strong>
                        </div>
                        <div className="flex-row flex-align-center flex-gap-sm text-sm text-muted">
                          <FaEnvelope />
                          <a href={`mailto:${submission.email}`} onClick={(e) => e.stopPropagation()}>
                            {submission.email}
                          </a>
                        </div>
                        {submission.phone && (
                          <div className="flex-row flex-align-center flex-gap-sm text-sm text-muted">
                            <FaPhone />
                            <a href={`tel:${submission.phone}`} onClick={(e) => e.stopPropagation()}>
                              {submission.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div className="font-semibold">{submission.subject}</div>
                      <div className="text-sm text-muted" style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {submission.message}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span className={getStatusBadgeClass(submission.status)}>
                        {STATUS_OPTIONS[submission.status] || submission.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }} onClick={(e) => e.stopPropagation()}>
                      <div className="flex-row flex-gap-sm">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedSubmission(submission)}
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {submission.status !== "replied" && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => updateStatus(submission.id, "replied")}
                            title="Mark as Replied"
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteSubmission(submission.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedSubmission(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflow: "auto" }}
          >
            <div className="flex-row flex-align-center flex-justify-between margin-bottom-md">
              <h3 className="section-subtitle">Contact Submission Details</h3>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedSubmission(null)}
              >
                <FaTimesCircle />
              </button>
            </div>

            <div className="spacing-y-md">
              <div>
                <label className="form-label">Status</label>
                <div className="margin-top-sm">
                  <span className={getStatusBadgeClass(selectedSubmission.status)}>
                    {STATUS_OPTIONS[selectedSubmission.status] || selectedSubmission.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label">Date Submitted</label>
                <div className="margin-top-sm text-muted">
                  {formatDate(selectedSubmission.createdAt)}
                </div>
              </div>

              <div>
                <label className="form-label">Name</label>
                <div className="margin-top-sm">
                  <div className="flex-row flex-align-center flex-gap-sm">
                    <FaUser className="text-muted" />
                    <strong>{selectedSubmission.name}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Email</label>
                <div className="margin-top-sm">
                  <div className="flex-row flex-align-center flex-gap-sm">
                    <FaEnvelope className="text-muted" />
                    <a href={`mailto:${selectedSubmission.email}`} className="text-link">
                      {selectedSubmission.email}
                    </a>
                  </div>
                </div>
              </div>

              {selectedSubmission.phone && (
                <div>
                  <label className="form-label">Phone</label>
                  <div className="margin-top-sm">
                    <div className="flex-row flex-align-center flex-gap-sm">
                      <FaPhone className="text-muted" />
                      <a href={`tel:${selectedSubmission.phone}`} className="text-link">
                        {selectedSubmission.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Subject</label>
                <div className="margin-top-sm">
                  <strong>{selectedSubmission.subject}</strong>
                </div>
              </div>

              <div>
                <label className="form-label">Message</label>
                <div className="margin-top-sm padding-md" style={{ backgroundColor: "#f9fafb", borderRadius: "4px", whiteSpace: "pre-wrap" }}>
                  {selectedSubmission.message}
                </div>
              </div>

              <div className="flex-row flex-gap-md margin-top-lg">
                {selectedSubmission.status !== "replied" && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      updateStatus(selectedSubmission.id, "replied");
                    }}
                  >
                    Mark as Replied
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    deleteSubmission(selectedSubmission.id);
                    setSelectedSubmission(null);
                  }}
                >
                  Delete Submission
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

