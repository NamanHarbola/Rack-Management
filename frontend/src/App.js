import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [racks, setRacks] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ racks: [], matchedItems: {} });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [viewingRack, setViewingRack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all racks
  const fetchRacks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/racks`);
      setRacks(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch racks");
      console.error("Error fetching racks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Search racks
  const searchRacks = async (query) => {
    if (!query.trim()) {
      setSearchResults({ racks: [], matchedItems: {} });
      return;
    }
    
    try {
      const response = await axios.get(`${API}/racks/search`, {
        params: { q: query }
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error("Error searching racks:", err);
      setSearchResults({ racks: [], matchedItems: {} });
    }
  };

  useEffect(() => {
    fetchRacks();
  }, []);

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery) {
        searchRacks(searchQuery);
      } else {
        setSearchResults({ racks: [], matchedItems: {} });
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  // Get racks to display (search results or all racks)
  const displayRacks = useMemo(() => {
    if (searchQuery && searchResults.racks.length > 0) {
      // Group search results by floor
      const grouped = {};
      searchResults.racks.forEach(rack => {
        if (!grouped[rack.floor]) {
          grouped[rack.floor] = [];
        }
        grouped[rack.floor].push(rack);
      });
      return grouped;
    }
    return racks;
  }, [searchQuery, searchResults, racks]);

  // Function to highlight search terms in text
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  const AddRackForm = () => {
    const [formData, setFormData] = useState({
      rackNumber: "",
      floor: "",
      items: ""
    });

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
        fetchRacks();
      } catch (err) {
        setError("Failed to add rack");
        console.error("Error adding rack:", err);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
          <h3 className="text-xl font-bold mb-4">Add New Rack</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rack Number
              </label>
              <input
                type="text"
                required
                value={formData.rackNumber}
                onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., R001"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor
              </label>
              <input
                type="text"
                required
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Ground Floor, 1st Floor"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items (comma-separated)
              </label>
              <textarea
                value={formData.items}
                onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="e.g., Electronics, Cables, Batteries"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Rack
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditRackForm = ({ rack }) => {
    const [formData, setFormData] = useState({
      rackNumber: rack.rackNumber,
      floor: rack.floor,
      items: rack.items.join(", ")
    });

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
        fetchRacks();
      } catch (err) {
        setError("Failed to update rack");
        console.error("Error updating rack:", err);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
          <h3 className="text-xl font-bold mb-4">Edit Rack</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rack Number
              </label>
              <input
                type="text"
                required
                value={formData.rackNumber}
                onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor
              </label>
              <input
                type="text"
                required
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items (comma-separated)
              </label>
              <textarea
                value={formData.items}
                onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingRack(null)}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const RackCard = ({ rack, isHighlighted = false }) => {
    const handleDelete = async () => {
      if (window.confirm("Are you sure you want to delete this rack?")) {
        try {
          await axios.delete(`${API}/racks/${rack.id}`);
          fetchRacks();
        } catch (err) {
          setError("Failed to delete rack");
          console.error("Error deleting rack:", err);
        }
      }
    };

    const matchedItems = searchResults.matchedItems[rack.id] || [];

    return (
      <div className={`bg-white rounded-lg shadow-md p-4 border-2 transition-all duration-200 ${
        isHighlighted ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-blue-300'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">
              {searchQuery ? (
                <span dangerouslySetInnerHTML={{
                  __html: highlightText(rack.rackNumber, searchQuery)
                }} />
              ) : rack.rackNumber}
            </h4>
            <p className="text-sm text-gray-600">
              Floor: {searchQuery ? (
                <span dangerouslySetInnerHTML={{
                  __html: highlightText(rack.floor, searchQuery)
                }} />
              ) : rack.floor}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setEditingRack(rack)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Edit Rack"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 p-1"
              title="Delete Rack"
            >
              🗑️
            </button>
          </div>
        </div>
        
        {rack.items && rack.items.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Items:</h5>
            <div className="flex flex-wrap gap-1">
              {rack.items.map((item, index) => {
                const isMatched = matchedItems.includes(item);
                return (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full ${
                      isMatched 
                        ? 'bg-yellow-200 text-yellow-800 font-medium' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {searchQuery && isMatched ? (
                      <span dangerouslySetInnerHTML={{
                        __html: highlightText(item, searchQuery)
                      }} />
                    ) : item}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="mt-3 text-xs text-gray-500">
          Created: {new Date(rack.createdAt).toLocaleDateString()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading racks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MADAN STORE</h1>
              <p className="text-gray-600">Rack & Inventory Management System</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              + Add Rack
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search racks by number, floor, or items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Found {searchResults.racks.length} rack(s) matching "{searchQuery}"
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Racks by Floor */}
        <div className="space-y-8">
          {Object.entries(displayRacks).sort(([a], [b]) => a.localeCompare(b)).map(([floor, floorRacks]) => (
            <div key={floor} className="bg-white rounded-lg shadow-sm">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-800">
                  {searchQuery ? (
                    <span dangerouslySetInnerHTML={{
                      __html: highlightText(floor, searchQuery)
                    }} />
                  ) : floor}
                </h2>
                <p className="text-gray-600">{floorRacks.length} rack(s)</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {floorRacks.map((rack) => (
                    <RackCard 
                      key={rack.id} 
                      rack={rack} 
                      isHighlighted={searchQuery && searchResults.racks.some(r => r.id === rack.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {Object.keys(displayRacks).length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery ? "No racks found" : "No racks yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? `No racks match your search "${searchQuery}"`
                : "Start by adding your first rack to the system"
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
              >
                Add Your First Rack
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddForm && <AddRackForm />}
      {editingRack && <EditRackForm rack={editingRack} />}
    </div>
  );
}

export default App;