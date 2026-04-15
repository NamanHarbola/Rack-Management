import React, { useState, useEffect, useMemo, Suspense } from "react";
import "./App.css";
import axios from "axios";

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRacks = async (pageNum = 1) => {
    if (pageNum === 1) setRacks(null);
    setLoading(true);
    try {
      const response = await axios.get(`${API}/racks`, { params: { page: pageNum, limit: 5 } });
      setRacks(prev => ({ ...(prev || {}), ...response.data }));
      if (Object.keys(response.data).length < 5) setHasMore(false);
      setPage(pageNum);
    } catch (err) { console.error("Fetch failed", err); }
    finally { setLoading(false); }
  };

  const searchRacks = async (query, signal) => {
    try {
      const res = await axios.get(`${API}/racks/search`, { params: { q: query }, signal });
      setSearchResults(res.data);
    } catch (err) { if (!axios.isCancel(err)) setSearchResults({ racks: [], matchedItems: {} }); }
  };

  useEffect(() => { fetchRacks(1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      if (searchQuery) searchRacks(searchQuery, controller.signal);
      else setSearchResults({ racks: [], matchedItems: {} });
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [searchQuery]);

  const displayRacks = useMemo(() => {
    if (searchQuery && searchResults.racks.length > 0) {
      const grouped = {};
      searchResults.racks.forEach(r => {
        if (!grouped[r.floor]) grouped[r.floor] = [];
        grouped[r.floor].push(r);
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

  return (
    <div className="min-h-screen bg-slate-50" style={{ backgroundImage: `url('https://images.pexels.com/photos/8108660/pexels-photo-8108660.jpeg')`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <header className="bg-blue-900/90 text-white py-10 shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black">MADAN STORE</h1>
            <p className="text-blue-200">Inventory & Rack Management</p>
          </div>
          <button onClick={() => setShowAddForm(true)} className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-bold transition-all">
            + New Rack
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <input 
          type="text" placeholder="Search inventory..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-4 mb-8 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none shadow-sm"
        />

        {racks === null && loading ? (
          <div className="text-center py-20 animate-pulse text-slate-500">Connecting to Madan Store DB...</div>
        ) : (
          <div className="space-y-10">
            {Object.entries(displayRacks).sort().map(([floor, floorRacks]) => (
              <section key={floor}>
                <h2 className="text-xl font-bold mb-4 text-slate-700 bg-white inline-block px-4 py-1 rounded-lg border">Floor: {floor}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {floorRacks.map(rack => (
                    <div key={rack.id} onClick={() => setViewingRack(rack)} className="bg-white p-6 rounded-xl shadow-md border-2 border-transparent hover:border-blue-400 cursor-pointer transition-all">
                      <h3 className="text-lg font-bold flex items-center">📦 <span className="ml-2" dangerouslySetInnerHTML={{__html: highlightText(rack.rackNumber, searchQuery)}}/></h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rack.items.slice(0, 3).map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full" dangerouslySetInnerHTML={{__html: highlightText(item, searchQuery)}}/>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {hasMore && !searchQuery && (
          <button onClick={() => fetchRacks(page + 1)} className="mt-10 mx-auto block bg-white border border-slate-300 px-8 py-3 rounded-full hover:bg-slate-50">
            Load More Floors
          </button>
        )}
      </main>

      <Suspense fallback={<div />}>
        {showAddForm && <AddRackForm setShowAddForm={setShowAddForm} fetchRacks={() => fetchRacks(1)} />}
        {editingRack && <EditRackForm rack={editingRack} setEditingRack={setEditingRack} fetchRacks={() => fetchRacks(1)} />}
        {viewingRack && <RackDetailModal rack={viewingRack} setViewingRack={setViewingRack} highlightText={highlightText} searchQuery={searchQuery} />}
      </Suspense>
    </div>
  );
}

export default App;