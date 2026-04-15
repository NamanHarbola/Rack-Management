import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddRackForm = ({ setShowAddForm, fetchRacks }) => {
  const [formData, setFormData] = useState({ rackNumber: "", floor: "", items: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemsList = formData.items.split(",").map((i) => i.trim()).filter(Boolean);
      await axios.post(`${API}/racks`, {
        rackNumber: formData.rackNumber,
        floor: formData.floor,
        items: itemsList,
      });
      setShowAddForm(false);
      setFormData({ rackNumber: "", floor: "", items: "" });
      fetchRacks(1);
    } catch (err) {
      setError("Failed to add rack. Please try again.");
      console.error("Error adding rack:", err);
    }
  };

  const tagList = formData.items.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        .rack-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 24px;
          backdrop-filter: blur(6px);
          font-family: 'DM Sans', sans-serif;
        }

        .rack-modal {
          background: #16161d;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
          animation: rackSlideUp 0.35s cubic-bezier(0.16,1,0.3,1);
        }

        @keyframes rackSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .rack-header {
          background: linear-gradient(135deg, #1e1e2e 0%, #1a1a28 100%);
          padding: 28px 28px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
        }

        .rack-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .rack-header-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .rack-icon-badge {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          box-shadow: 0 4px 14px rgba(99,102,241,0.4);
          flex-shrink: 0;
        }

        .rack-header h3 {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #f0f0f8;
          letter-spacing: -0.3px;
          margin: 0;
        }

        .rack-header p {
          font-size: 13px;
          color: rgba(255,255,255,0.38);
          margin: 2px 0 0;
        }

        .rack-body {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .rack-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 13.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rack-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rack-field label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.7px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }

        .rack-input-wrap {
          position: relative;
        }

        .rack-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          opacity: 0.45;
          pointer-events: none;
        }

        .rack-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          padding: 13px 14px 13px 42px;
          color: #e8e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          outline: none;
        }

        .rack-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          padding: 13px 14px;
          color: #e8e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          outline: none;
          resize: none;
          line-height: 1.55;
        }

        .rack-input::placeholder,
        .rack-textarea::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .rack-input:focus,
        .rack-textarea:focus {
          border-color: #6366f1;
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .rack-helper {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
        }

        .rack-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .rack-tag {
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          color: #a5b4fc;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
          animation: rackTagPop 0.15s ease;
        }

        @keyframes rackTagPop {
          from { transform: scale(0.75); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        .rack-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 0 28px 4px;
        }

        .rack-footer {
          padding: 12px 28px 28px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .rack-btn {
          padding: 12px 22px;
          border-radius: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.18s ease;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .rack-btn-cancel {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          border: 1.5px solid rgba(255,255,255,0.08);
        }

        .rack-btn-cancel:hover {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
        }

        .rack-btn-submit {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
          position: relative;
          overflow: hidden;
        }

        .rack-btn-submit:hover {
          box-shadow: 0 6px 22px rgba(99,102,241,0.5);
          transform: translateY(-1px);
          filter: brightness(1.1);
        }

        .rack-btn-submit:active {
          transform: translateY(0);
        }
      `}</style>

      <div className="rack-overlay">
        <div className="rack-modal">

          <div className="rack-header">
            <div className="rack-header-top">
              <div className="rack-icon-badge">📦</div>
              <div>
                <h3>Add New Rack</h3>
                <p>Fill in the details to register a rack</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="rack-body">

              {error && (
                <div className="rack-error">⚠️ {error}</div>
              )}

              <div className="rack-field">
                <label>Rack Number</label>
                <div className="rack-input-wrap">
                  <span className="rack-input-icon">🔢</span>
                  <input
                    type="text"
                    required
                    className="rack-input"
                    placeholder="e.g., R001"
                    value={formData.rackNumber}
                    onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="rack-field">
                <label>Floor</label>
                <div className="rack-input-wrap">
                  <span className="rack-input-icon">🏢</span>
                  <input
                    type="text"
                    required
                    className="rack-input"
                    placeholder="e.g., Ground Floor, 1st Floor"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  />
                </div>
              </div>

              <div className="rack-field">
                <label>Items</label>
                <textarea
                  className="rack-textarea"
                  rows={3}
                  placeholder="e.g., Electronics, Cables, Batteries"
                  value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                />
                <p className="rack-helper">Separate multiple items with commas</p>
                {tagList.length > 0 && (
                  <div className="rack-tags">
                    {tagList.map((tag, i) => (
                      <span key={i} className="rack-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="rack-divider" />

            <div className="rack-footer">
              <button
                type="button"
                className="rack-btn rack-btn-cancel"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="rack-btn rack-btn-submit">
                + Add Rack
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  );
};

export default AddRackForm;