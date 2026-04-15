import React, { useState, useEffect } from "react";
import axios from "axios";

// Ensure the backend URL is correctly resolved
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const EditRackForm = ({ rack, setEditingRack, fetchRacks }) => {
  // Use state properly initialized with rack data
  const [formData, setFormData] = useState({
    rackNumber: rack?.rackNumber || "",
    floor: rack?.floor || "",
    items: rack?.items?.join(", ") || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync state if the rack prop changes while modal is open
  useEffect(() => {
    if (rack) {
      setFormData({
        rackNumber: rack.rackNumber || "",
        floor: rack.floor || "",
        items: rack.items?.join(", ") || "",
      });
    }
  }, [rack]);

  const handleClose = () => {
    if (typeof setEditingRack === "function") {
      setEditingRack(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rack?.id) {
      setError("Critical Error: Rack ID is missing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Clean up the items string into an array
      const itemsList = formData.items
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      // Perform the PUT request
      await axios.put(`${API}/racks/${rack.id}`, {
        rackNumber: formData.rackNumber,
        floor: formData.floor,
        items: itemsList,
      });

      // Cleanup and refresh
      handleClose();
      if (typeof fetchRacks === "function") {
        fetchRacks(1); // Refresh from page 1 to ensure UI is in sync
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to update rack. Check server connection.";
      setError(msg);
      console.error("Update Error:", err);
    } finally {
      setSaving(false);
    }
  };

  const tagList = formData.items.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        .edit-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100; /* Higher z-index to overlay everything */
          padding: 24px;
          backdrop-filter: blur(6px);
          font-family: 'DM Sans', sans-serif;
        }

        .edit-modal {
          background: #16161d;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6);
          animation: editSlideUp 0.35s cubic-bezier(0.16,1,0.3,1);
        }

        @keyframes editSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .edit-header {
          background: linear-gradient(135deg, #1e1e2e 0%, #1a1a28 100%);
          padding: 24px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .edit-icon-badge {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          box-shadow: 0 4px 14px rgba(16,185,129,0.35);
        }

        .edit-header h3 {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #f0f0f8;
          margin: 0;
        }

        .edit-close-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .edit-body { padding: 28px; display: flex; flex-direction: column; gap: 18px; }

        .edit-error {
          background: rgba(239,68,68,0.1);
          color: #fca5a5;
          padding: 11px;
          border-radius: 10px;
          font-size: 13px;
          border: 1px solid rgba(239,68,68,0.2);
        }

        .edit-field { display: flex; flex-direction: column; gap: 8px; }
        .edit-field label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; }

        .edit-input, .edit-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          padding: 12px;
          color: #e8e8f0;
          outline: none;
        }

        .edit-input:focus, .edit-textarea:focus { border-color: #10b981; }

        .edit-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .edit-tag { background: rgba(16,185,129,0.1); color: #6ee7b7; padding: 4px 10px; border-radius: 100px; font-size: 11px; }

        .edit-footer { padding: 0 28px 28px; display: flex; gap: 10px; justify-content: flex-end; }
        .edit-btn { padding: 12px 22px; border-radius: 11px; font-weight: 600; cursor: pointer; border: none; }
        .edit-btn-cancel { background: #2a2a35; color: #fff; }
        .edit-btn-submit { background: #10b981; color: #fff; }
        
        .edit-spinner { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="edit-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div className="edit-modal">
          <div className="edit-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="edit-icon-badge">✏️</div>
              <div>
                <h3>Edit Rack</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  ID: {rack?.rackNumber || 'N/A'}
                </p>
              </div>
            </div>
            <button className="edit-close-btn" onClick={handleClose}>×</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="edit-body">
              {error && <div className="edit-error">⚠️ {error}</div>}

              <div className="edit-field">
                <label>Rack Number</label>
                <input
                  className="edit-input"
                  value={formData.rackNumber}
                  required
                  onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                />
              </div>

              <div className="edit-field">
                <label>Floor</label>
                <input
                  className="edit-input"
                  value={formData.floor}
                  required
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </div>

              <div className="edit-field">
                <label>Items (Comma separated)</label>
                <textarea
                  className="edit-textarea"
                  rows={3}
                  value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                />
                <div className="edit-tags">
                  {tagList.map((tag, i) => (
                    <span key={i} className="edit-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="edit-footer">
              <button type="button" className="edit-btn edit-btn-cancel" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="edit-btn edit-btn-submit" disabled={saving}>
                {saving ? "Saving..." : "Update Rack"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditRackForm;