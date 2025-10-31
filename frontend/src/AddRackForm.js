import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddRackForm = ({ setShowAddForm, fetchRacks }) => {
  const [formData, setFormData] = useState({
    rackNumber: "",
    floor: "",
    items: ""
  });
  const [error, setError] = useState(""); // Add error state for the form

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemsList = formData.items.split(",").map(item => item.trim()).filter(item => item);
      await axios.post(`${API}/racks`, {
        rackNumber: formData.rackNumber,
        floor: formData.floor,
        items: itemsList
      });
      setShowAddForm(false);
      setFormData({ rackNumber: "", floor: "", items: "" });
      fetchRacks(1); // Refetch from page 1
    } catch (err) {
      setError("Failed to add rack");
      console.error("Error adding rack:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-8 w-96 max-w-90vw shadow-2xl border border-blue-100">
        <div className="flex items-center mb-6">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <span className="text-2xl">📦</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Add New Rack</h3>
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
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="e.g., R001"
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
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="e.g., Ground Floor, 1st Floor"
            />
          </div>
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Items (comma-separated)
            </label>
            <textarea
              value={formData.items}
              onChange={(e) => setFormData({ ...formData, items: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              rows="4"
              placeholder="e.g., Electronics, Cables, Batteries"
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all shadow-lg"
            >
              Add Rack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRackForm;
