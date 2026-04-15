import React, { useState, useEffect, useMemo, Suspense } from "react";
import "./App.css";
import axios from "axios";

// Lazy-load the modal components
const AddRackForm = React.lazy(() => import('./AddRackForm'));
const EditRackForm = React.lazy(() => import('./EditRackForm'));
const RackDetailModal = React.lazy(() => import('./RackDetailModal'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [racks, setRacks] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ racks: [], matchedItems: {} });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [viewingRack, setViewingRack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // --- Optimized Fetch Logic ---
  const fetchRacks = async (pageNum = 1) => {
    if (pageNum === 1) {
      setRacks(null);
      setHasMore(true);
    }
    
    setLoading(true);
    try {
      // Using optimized backend endpoint
      const response = await axios.get(`${API}/racks`, {
        params: { page: pageNum, limit: 5 }
      });
      const newRacks = response.data;
      
      setRacks(prevRacks => ({
        ...(prevRacks || {}),
        ...newRacks
      }));
      
      if (Object.keys(newRacks).length === 0 || Object.keys(newRacks).length < 5) {
        setHasMore(false);
      }
      
      setPage(pageNum);
      setError("");
    } catch (err) {
      setError("Failed to fetch racks from Madan Store database.");
      console.error("Error fetching racks:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Search with Request Cancellation (AbortController) ---
  const searchRacks = async (query, signal) => {
    if (!query.trim()) {
      setSearchResults({ racks: [], matchedItems: {} });
      return;
    }
    
    try {
      const response = await axios.get(`${API}/racks/search`, {
        params: { q: query },
        signal: signal // Attaching signal to cancel previous requests
      });
      setSearchResults(response.data);
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Request canceled:", err.message);
      } else {
        console.error("Search error:", err);
        setSearchResults({ racks: [], matchedItems: {} });
      }
    }
  };

  useEffect(() => {
    fetchRacks(1);
  }, []);

  // Debounced search with AbortController
  useEffect(() => {
    const controller = new AbortController();
    
    const delayedSearch = setTimeout(() => {
      if (searchQuery) {
        searchRacks(searchQuery, controller.signal);
      } else {
        setSearchResults({ racks: [], matchedItems: {} });
      }
    }, 300);

    return () => {
      clearTimeout(delayedSearch);
      controller.abort(); // Cancel the request if the user types another character
    };
  }, [searchQuery]);

  const displayRacks = useMemo(() => {
    if (searchQuery && searchResults.racks.length > 0) {
      const grouped = {};
      searchResults.racks.forEach(rack => {
        if (!grouped[rack.floor]) grouped[rack.floor] = [];
        grouped[rack.floor].push(rack);
      });
      return grouped;
    }
    return racks || {};
  }, [searchQuery, searchResults, racks]);

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  const RackCard = ({ rack, isHighlighted = false }) => {
    const handleDelete = async () => {
      if (window.confirm("Delete this rack from inventory?")) {
        try {
          await axios.delete(`${API}/racks/${rack.id}`);
          // Optimistic local update or fresh fetch
          fetchRacks(1); 
        } catch (err) {
          setError("Failed to delete rack");
        }
      }
    };

    const matchedItems = searchResults.matchedItems[rack.id] || [];

    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-105 ${
        isHighlighted ? 'border-yellow-400 bg-yellow-50/90' : 'border-blue-200 hover:border-blue-400'
      }`}
      onClick={() => setViewingRack(rack)}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-xl font-bold text-gray-800 flex items-center">
              <span className="text-2xl mr-2">📦</span>
              <span dangerouslySetInnerHTML={{ __html: highlightText(rack.rackNumber, searchQuery) }} />
            </h4>
            <p className="text-sm text-gray-600 font-medium ml-8">
              Floor: <span dangerouslySetInnerHTML={{ __html: highlightText(rack.floor, searchQuery) }} />
            </p>
          </div>
          <div className="flex space-x-2">
            <button onClick={(e) => { e.stopPropagation(); setEditingRack(rack); }} className="p-2 hover:bg-blue-50 rounded-lg">✏️</button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="p-2 hover:bg-red-50 rounded-lg">🗑️</button>
          </div>
        </div>
        
        {rack.items && rack.items.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {rack.items.slice(0, 3).map((item, index) => (
                <span key={index} className={`px-3 py-1 text-xs rounded-full ${matchedItems.includes(item) ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                  <span dangerouslySetInnerHTML={{ __html: highlightText(item, searchQuery) }} />
                </span>
              ))}
              {rack.items.length > 3 && <span className="text-xs text-gray-400">+{rack.items.length - 3} more</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ backgroundImage: `url('https://images.pexels.com/photos/8108660/pexels-photo-8108660.jpeg')`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <div className="bg-blue-900/90 text-white py-12 shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">MADAN STORE</h1>
            <p className="text-blue-200 mt-2">Rack & Inventory Management</p>
          </div>
          <button onClick={() => setShowAddForm(true)} className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-bold transition-all shadow-lg">
            + Add New Rack
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <input
            type="text"
            placeholder="Search by rack, floor, or item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all text-lg"
          />
        </div>

        {racks === null && loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-500 font-medium">Syncing with Madan Store Database...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(displayRacks).sort().map(([floor, floorRacks]) => (
              <section key={floor}>
                <div className="flex items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">Floor: {floor}</h2>
                  <div className="ml-4 h-[2px] bg-slate-200 flex-grow"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {floorRacks.map(rack => (
                    <RackCard key={rack.id} rack={rack} isHighlighted={searchQuery && searchResults.racks.some(r => r.id === rack.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {hasMore && !searchQuery && (
          <div className="flex justify-center mt-12">
            <button onClick={() => fetchRacks(page + 1)} disabled={loading} className="bg-white border border-slate-200 px-8 py-3 rounded-full font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
              {loading ? "Loading..." : "View More Floors"}
            </button>
          </div>
        )}
      </main>

      <Suspense fallback={<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />}>
        {showAddForm && <AddRackForm setShowAddForm={setShowAddForm} fetchRacks={() => fetchRacks(1)} />}
        {editingRack && <EditRackForm rack={editingRack} setEditingRack={setEditingRack} fetchRacks={() => fetchRacks(1)} />}
        {viewingRack && <RackDetailModal rack={viewingRack} setViewingRack={setViewingRack} highlightText={highlightText} searchQuery={searchQuery} />}
      </Suspense>
    </div>
  );
}

export default App;