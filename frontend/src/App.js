import React, { useState, useEffect, useMemo, Suspense } from "react";
import axios from "axios";

// Lazy loaded components for better performance
const AddRackForm = React.lazy(() => import('./AddRackForm'));
const EditRackForm = React.lazy(() => import('./EditRackForm'));
const RackDetailModal = React.lazy(() => import('./RackDetailModal'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// --- Enhanced Icons ---
const BoxIcon = ({ color = "currentColor" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const BuildingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M6 21V7l6-4 6 4v14"/>
  </svg>
);

// --- Utilities ---
const highlightText = (text, query) => {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark style="background:#fef08a;color:#713f12;border-radius:4px;padding:0 2px">$1</mark>');
};

// --- Modern Components ---
function RackCard({ rack, query, onClick }) {
  const visibleItems = rack.items.slice(0, 3);
  const extraCount = rack.items.length - 3;
  
  return (
    <div 
      onClick={onClick} 
      className="rack-card-modern"
      style={{
        background: 'white',
        border: '1px solid #eef2f6',
        borderRadius: '20px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, background: '#f0f7ff', color: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BoxIcon color="#3b82f6" />
        </div>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          {rack.items.length} ITEMS
        </span>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
        <span dangerouslySetInnerHTML={{ __html: highlightText(rack.rackNumber, query) }} />
      </h3>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <BuildingIcon /> Level: <span dangerouslySetInnerHTML={{ __html: highlightText(rack.floor, query) }} />
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {visibleItems.map((item, i) => (
          <span key={i} style={{ fontSize: '11px', padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '6px', fontWeight: '500' }}>
            <span dangerouslySetInnerHTML={{ __html: highlightText(item, query) }} />
          </span>
        ))}
        {extraCount > 0 && (
          <span style={{ fontSize: '11px', padding: '4px 10px', background: '#3b82f6', color: 'white', borderRadius: '6px', fontWeight: '600' }}>
            +{extraCount}
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [racks, setRacks] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ racks: [], matchedItems: {} });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [viewingRack, setViewingRack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch Logic handles initial load and "Load More" pagination
  const fetchRacks = async (pageNum = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/racks`, { params: { page: pageNum, limit: 10 } });
      setRacks(prev => pageNum === 1 ? response.data : { ...prev, ...response.data });
      
      // If the response contains fewer items than the limit, there's no more data
      if (Object.keys(response.data).length < 1) setHasMore(false);
      else setHasMore(true);
      
      setPage(pageNum);
    } catch (err) { 
      console.error("Fetch failed:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  // Search Logic with AbortController for clean debouncing
  const searchRacks = async (query, signal) => {
    try {
      const res = await axios.get(`${API}/racks/search`, { params: { q: query }, signal });
      setSearchResults(res.data);
    } catch (err) {
      if (!axios.isCancel(err)) setSearchResults({ racks: [], matchedItems: {} });
    }
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

  // Merge group logic for both normal view and search results
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

  const totalRacksCount = useMemo(() => 
    Object.values(displayRacks).reduce((sum, arr) => sum + arr.length, 0), 
    [displayRacks]
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style>{`
        .rack-card-modern:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
          border-color: #3b82f6 !important;
        }
        .search-input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .section-header {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: #1e293b;
          color: #f1f5f9;
          font-size: 13px;
          font-weight: 600;
          border-radius: 30px;
          margin-bottom: 20px;
        }
      `}</style>

      {/* Modern Header */}
      <header style={{ background: 'white', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '8px', background: '#0f172a', borderRadius: '10px' }}>
            <BoxIcon color="white" />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>MadanStore <span style={{color: '#3b82f6'}}>Pro</span></h1>
        </div>
        
        <button onClick={() => setShowAddForm(true)} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
          + Create Rack
        </button>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Inventory Overview</h2>
          <p style={{ color: '#64748b' }}>Currently monitoring {totalRacksCount} locations across all floors.</p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto 40px' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}><SearchIcon /></span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by rack number or item name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '16px 16px 16px 48px', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '15px', outline: 'none', transition: 'all 0.2s', background: 'white' }}
          />
        </div>

        {/* Dynamic List Content grouped by Floor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {Object.entries(displayRacks).sort().map(([floor, floorRacks]) => (
            <section key={floor}>
              <div className="section-header">
                <BuildingIcon /> {floor}
                <span style={{ background: '#334155', padding: '1px 8px', borderRadius: '10px', fontSize: '11px' }}>{floorRacks.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {floorRacks.map(rack => (
                  <RackCard 
                    key={rack.id} 
                    rack={rack} 
                    query={searchQuery}
                    onClick={() => setViewingRack(rack)} 
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Pagination Trigger */}
        {hasMore && !searchQuery && !loading && (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <button 
              onClick={() => fetchRacks(page + 1)} 
              style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 32px', borderRadius: '16px', fontSize: '14px', fontWeight: '600', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Load More Floors
            </button>
          </div>
        )}
      </main>

      {/* Modal Systems with Suspense */}
      <Suspense fallback={null}>
        {showAddForm && (
          <AddRackForm 
            setShowAddForm={setShowAddForm} 
            fetchRacks={() => fetchRacks(1)} 
          />
        )}
        {editingRack && (
          <EditRackForm 
            rack={editingRack} 
            setEditingRack={setEditingRack} 
            fetchRacks={() => fetchRacks(1)} 
          />
        )}
        {viewingRack && (
          <RackDetailModal 
            rack={viewingRack} 
            setViewingRack={setViewingRack} 
            setEditingRack={setEditingRack}
            highlightText={highlightText} 
            searchQuery={searchQuery} 
          />
        )}
      </Suspense>
    </div>
  );
}