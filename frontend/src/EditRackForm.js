import React, { useState, useEffect } from "react";
import axios from "axios";

// Fallback to local if env is missing
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const EditRackForm = ({ rack, setEditingRack, fetchRacks }) => {
  const [formData, setFormData] = useState({
    rackNumber: rack?.rackNumber || "",
    floor: rack?.floor || "",
    items: rack?.items?.join(", ") || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Critical: Keep local state in sync if the rack prop updates
  useEffect(() => {
    if (rack) {
      setFormData({
        rackNumber: rack.rackNumber || "",
        floor: rack.floor || "",
        items: rack.items?.join(", ") || "",
      });
    }
  }, [rack]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rack?.id) {
      setError("Critical Error: Rack ID is missing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const itemsList = formData.items
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      // Verify this matches your backend: /api/racks/<id>
      await axios.put(`${API}/racks/${rack.id}`, {
        rackNumber: formData.rackNumber,
        floor: formData.floor,
        items: itemsList,
      });

      // 1. Refresh data first
      if (fetchRacks) await fetchRacks(1);
      
      // 2. Close the modal
      setEditingRack(null);
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
    <div 
      className="edit-overlay" 
      onClick={(e) => e.target === e.currentTarget && setEditingRack(null)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000, // Ensures it sits on top of all page content
      }}
    >
      <div 
        className="edit-modal"
        style={{
          background: '#16161d',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the box
      >
        <div 
          className="edit-header"
          style={{
            background: 'linear-gradient(135deg, #1e1e2e 0%, #1a1a28 100%)',
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
            <div 
              className="edit-icon-badge" 
              style={{
                width: '44px', 
                height: '44px', 
                background: '#10b981', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              ✏️
            </div>
            <div>
              <h3 style={{color: 'white', margin: 0, fontSize: '18px', fontWeight: '800'}}>Edit Rack</h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Editing: {rack?.rackNumber}
              </p>
            </div>
          </div>
          <button 
            className="edit-close-btn" 
            onClick={() => setEditingRack(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="edit-body" style={{ padding: '28px' }}>
            {error && (
              <div 
                className="edit-error" 
                style={{
                  color: '#fca5a5', 
                  padding: '12px', 
                  background: 'rgba(239,68,68,0.1)', 
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '12px', 
                  marginBottom: '20px',
                  fontSize: '13px'
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div className="edit-field" style={{ marginBottom: '20px' }}>
              <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Rack Number
              </label>
              <input
                className="edit-input"
                style={{
                  width: '100%', 
                  marginTop: '8px',
                  padding: '12px 16px', 
                  background: 'rgba(255,255,255,0.04)', 
                  border: '1.5px solid rgba(255,255,255,0.08)', 
                  color: 'white', 
                  borderRadius: '12px',
                  outline: 'none',
                  fontSize: '14px'
                }}
                value={formData.rackNumber}
                required
                onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
              />
            </div>

            <div className="edit-field" style={{ marginBottom: '20px' }}>
              <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Floor / Level
              </label>
              <input
                className="edit-input"
                style={{
                  width: '100%', 
                  marginTop: '8px',
                  padding: '12px 16px', 
                  background: 'rgba(255,255,255,0.04)', 
                  border: '1.5px solid rgba(255,255,255,0.08)', 
                  color: 'white', 
                  borderRadius: '12px',
                  outline: 'none',
                  fontSize: '14px'
                }}
                value={formData.floor}
                required
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              />
            </div>

            <div className="edit-field">
              <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Items (Comma separated)
              </label>
              <textarea
                className="edit-textarea"
                style={{
                  width: '100%', 
                  marginTop: '8px',
                  padding: '12px 16px', 
                  background: 'rgba(255,255,255,0.04)', 
                  border: '1.5px solid rgba(255,255,255,0.08)', 
                  color: 'white', 
                  borderRadius: '12px', 
                  minHeight: '100px',
                  outline: 'none',
                  fontSize: '14px',
                  resize: 'none',
                  lineHeight: '1.5'
                }}
                value={formData.items}
                onChange={(e) => setFormData({ ...formData, items: e.target.value })}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                {tagList.map((tag, i) => (
                  <span 
                    key={i} 
                    style={{
                      background: 'rgba(16,185,129,0.15)', 
                      color: '#6ee7b7', 
                      padding: '4px 12px', 
                      borderRadius: '100px', 
                      fontSize: '11px',
                      fontWeight: '600',
                      border: '1px solid rgba(16,185,129,0.3)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div 
            className="edit-footer" 
            style={{
              padding: '0 28px 28px', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px'
            }}
          >
            <button 
              type="button" 
              style={{
                padding: '12px 24px', 
                background: 'rgba(255,255,255,0.06)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }} 
              onClick={() => setEditingRack(null)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              style={{
                padding: '12px 24px', 
                background: '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                fontWeight: '700',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              }}
            >
              {saving ? "Updating..." : "Update Rack"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRackForm;