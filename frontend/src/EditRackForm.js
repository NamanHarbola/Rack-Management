import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EditRackForm = ({ rack, setEditingRack, fetchRacks }) => {
  const [formData, setFormData] = useState({
    rackNumber: rack.rackNumber,
    floor: rack.floor,
    items: rack.items.join(", ")
  });
  const [error, setError] = useState(""); // Add error state for the form

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemsList = formData.items.split(",").map(item => item.trim()).filter(item => item);
      await axios.put(`${API}/racks/${rack.id}`, {
        rackNumber: formData.rackNumber,
        floor: formData.floor,
        items: itemsList
      });
      setEditingRack(null);
      fetchRacks(1); // Refetch from page 1
    } catch (err) {
      setError("Failed to update rack");
      console.error("Error updating rack:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-8 w-96 max-w-90vw shadow-2xl border border-green-100">
        <div className="flex items-center mb-6">
          <div className="bg-green-100 p-2 rounded-lg mr-3">
            <span className="text-2xl">✏️</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Edit Rack</h3>
        </div>
        {error && <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Rack Number
            </label>
            <input
              type="text"
              required
              value={formData.rackNumber}
              onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Floor
            </label>
            <input
              type="text"
              required
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
            />
          </div>
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Items (comma-separated)
            </label>
            <textarea
              value={formData.items}
              onChange={(e) => setFormData({ ...formData, items: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              rows="4"
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setEditingRack(null)}
              className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium transition-all shadow-lg"
            >
              Update Rack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRackForm;
