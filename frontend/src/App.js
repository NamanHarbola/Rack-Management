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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8 w-96 max-w-90vw shadow-2xl border border-blue-100">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Add New Rack</h3>
          </div>
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8 w-96 max-w-90vw shadow-2xl border border-green-100">
          <div className="flex items-center mb-6">
            <div className="bg-green-100 p-2 rounded-lg mr-3">
              <span className="text-2xl">✏️</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Edit Rack</h3>
          </div>
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
      <div className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-105 ${
        isHighlighted ? 'border-yellow-400 bg-yellow-50/90 shadow-yellow-200' : 'border-blue-200 hover:border-blue-400'
      }`}
      onClick={() => setViewingRack(rack)}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-xl font-bold text-gray-800 flex items-center">
              <span className="text-2xl mr-2">📦</span>
              {searchQuery ? (
                <span dangerouslySetInnerHTML={{
                  __html: highlightText(rack.rackNumber, searchQuery)
                }} />
              ) : rack.rackNumber}
            </h4>
            <p className="text-sm text-gray-600 font-medium ml-8">
              Floor: {searchQuery ? (
                <span dangerouslySetInnerHTML={{
                  __html: highlightText(rack.floor, searchQuery)
                }} />
              ) : rack.floor}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingRack(rack);
              }}
              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-all"
              title="Edit Rack"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-all"
              title="Delete Rack"
            >
              🗑️
            </button>
          </div>
        </div>
        
        {rack.items && rack.items.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <span className="text-lg mr-2">📋</span>Items:
            </h5>
            <div className="flex flex-wrap gap-2">
              {rack.items.slice(0, 3).map((item, index) => {
                const isMatched = matchedItems.includes(item);
                return (
                  <span
                    key={index}
                    className={`px-3 py-1 text-sm rounded-full font-medium ${
                      isMatched 
                        ? 'bg-yellow-200 text-yellow-800 shadow-sm' 
                        : 'bg-blue-100 text-blue-800'
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
              {rack.items.length > 3 && (
                <span className="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-600 font-medium">
                  +{rack.items.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-3">
          <span className="flex items-center">
            <span className="mr-1">📅</span>
            {new Date(rack.createdAt).toLocaleDateString()}
          </span>
          <span className="text-blue-600 font-semibold flex items-center">
            Click to view details 
            <span className="ml-1">→</span>
          </span>
        </div>
      </div>
    );
  };

  const RackDetailModal = ({ rack }) => {
    const matchedItems = searchResults.matchedItems[rack.id] || [];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8 w-full max-w-4xl max-h-90vh overflow-y-auto mx-4 shadow-2xl border border-blue-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3 flex items-center">
                <span className="text-4xl mr-3">📦</span>
                {searchQuery ? (
                  <span dangerouslySetInnerHTML={{
                    __html: highlightText(rack.rackNumber, searchQuery)
                  }} />
                ) : rack.rackNumber}
              </h2>
              <p className="text-xl text-gray-600 mb-2 ml-16">
                <span className="font-semibold">Floor:</span> {searchQuery ? (
                  <span dangerouslySetInnerHTML={{
                    __html: highlightText(rack.floor, searchQuery)
                  }} />
                ) : rack.floor}
              </p>
              <p className="text-sm text-gray-500 ml-16">
                <span className="font-medium">Created:</span> {new Date(rack.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              {rack.updatedAt !== rack.createdAt && (
                <p className="text-sm text-gray-500 ml-16">
                  <span className="font-medium">Last updated:</span> {new Date(rack.updatedAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setViewingRack(null);
                  setEditingRack(rack);
                }}
                className="text-blue-600 hover:text-blue-800 p-3 rounded-xl hover:bg-blue-50 transition-all"
                title="Edit Rack"
              >
                <span className="text-2xl">✏️</span> Edit
              </button>
              <button
                onClick={() => setViewingRack(null)}
                className="text-gray-500 hover:text-gray-700 p-3 rounded-xl hover:bg-gray-100 transition-all"
                title="Close"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-3xl mr-3">📋</span>
              Items in this Rack ({rack.items.length})
            </h3>
            {rack.items && rack.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rack.items.map((item, index) => {
                  const isMatched = matchedItems.includes(item);
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isMatched 
                          ? 'bg-yellow-100 border-yellow-300 shadow-md' 
                          : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-lg ${isMatched ? 'text-yellow-900' : 'text-gray-800'}`}>
                          {searchQuery && isMatched ? (
                            <span dangerouslySetInnerHTML={{
                              __html: highlightText(item, searchQuery)
                            }} />
                          ) : item}
                        </span>
                        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full font-medium border">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="text-8xl mb-4">📦</div>
                <h4 className="text-xl font-semibold mb-2">No items in this rack yet</h4>
                <p className="text-gray-400">Add some items to get started</p>
              </div>
            )}
          </div>
          
          {searchQuery && matchedItems.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6 mb-6">
              <h4 className="font-bold text-yellow-800 mb-3 flex items-center text-lg">
                <span className="text-2xl mr-2">🔍</span>
                Search Matches
              </h4>
              <p className="text-yellow-700 mb-4">
                Found <strong className="text-yellow-800">{matchedItems.length}</strong> item(s) matching "<strong className="text-yellow-800">{searchQuery}</strong>":
              </p>
              <div className="flex flex-wrap gap-3">
                {matchedItems.map((item, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-yellow-200 text-yellow-800 rounded-full font-semibold border border-yellow-300"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(item, searchQuery)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-6 border-t-2 border-gray-200">
            <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
              <span className="font-semibold">Rack ID:</span> {rack.id}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setViewingRack(null);
                  setEditingRack(rack);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-lg"
              >
                Edit Rack
              </button>
              <button
                onClick={() => setViewingRack(null)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center"
           style={{
             backgroundImage: `url('https://images.pexels.com/photos/8108660/pexels-photo-8108660.jpeg')`,
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundBlendMode: 'overlay'
           }}>
        <div className="text-center bg-white/90 backdrop-blur-md p-12 rounded-2xl shadow-2xl border border-blue-200">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-xl font-semibold">Loading your inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100"
         style={{
           backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.9), rgba(248, 250, 252, 0.9)), url('https://images.pexels.com/photos/8108660/pexels-photo-8108660.jpeg')`,
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundAttachment: 'fixed'
         }}>
      
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/31112250/pexels-photo-31112250.jpeg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        ></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl mr-6">
                <span className="text-5xl">🏪</span>
              </div>
              <div>
                <h1 className="text-5xl font-bold mb-2">MADAN STORE</h1>
                <p className="text-xl text-blue-100 font-medium">Professional Rack & Inventory Management System</p>
                <div className="flex items-center mt-2 text-blue-200">
                  <span className="mr-4">📊 Smart Organization</span>
                  <span className="mr-4">🔍 Instant Search</span>
                  <span>⚡ Real-time Updates</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl hover:from-green-600 hover:to-green-700 font-bold text-lg transition-all shadow-2xl flex items-center"
            >
              <span className="text-2xl mr-2">➕</span>
              Add Rack
            </button>
          </div>
        </div>
        
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 text-blue-50">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 mb-8 border border-blue-200">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-xl mr-4">
              <span className="text-3xl">🔍</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Search Inventory</h2>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search racks by number, floor, or items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-4 pl-12 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all bg-white/90 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-400 text-2xl">🔍</span>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-4 p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200">
              <p className="text-blue-800 font-medium">
                <span className="text-2xl mr-2">📊</span>
                Found <span className="font-bold">{searchResults.racks.length}</span> rack(s) matching 
                <span className="bg-blue-200 px-2 py-1 rounded-lg mx-2 font-bold">"{searchQuery}"</span>
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100/90 backdrop-blur-sm border-2 border-red-300 text-red-800 px-6 py-4 rounded-xl mb-8 flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            {error}
          </div>
        )}

        {/* Racks by Floor */}
        <div className="space-y-10">
          {Object.entries(displayRacks).sort(([a], [b]) => a.localeCompare(b)).map(([floor, floorRacks]) => (
            <div key={floor} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-4xl mr-4">🏢</span>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {searchQuery ? (
                          <span dangerouslySetInnerHTML={{
                            __html: highlightText(floor, searchQuery)
                          }} />
                        ) : floor}
                      </h2>
                      <p className="text-blue-100 font-medium">{floorRacks.length} rack(s) on this floor</p>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <span className="font-bold text-lg">{floorRacks.length}</span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="text-center py-20">
            <div 
              className="bg-white/90 backdrop-blur-md rounded-3xl p-16 shadow-2xl border-2 border-blue-200 mx-auto max-w-2xl"
              style={{
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('https://images.pexels.com/photos/615670/pexels-photo-615670.jpeg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="text-8xl mb-6">📦</div>
              <h3 className="text-3xl font-bold text-gray-700 mb-4">
                {searchQuery ? "No racks found" : "No racks yet"}
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {searchQuery 
                  ? `No racks match your search "${searchQuery}". Try a different term.`
                  : "Start building your inventory by adding your first rack to the system"
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold text-lg transition-all shadow-2xl flex items-center mx-auto"
                >
                  <span className="text-2xl mr-3">🚀</span>
                  Add Your First Rack
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddForm && <AddRackForm />}
      {editingRack && <EditRackForm rack={editingRack} />}
      {viewingRack && <RackDetailModal rack={viewingRack} />}
    </div>
  );
}

export default App;