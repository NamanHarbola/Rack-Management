import React, { useState, useEffect, useMemo, Suspense } from "react";
import axios from "axios";

const AddRackForm = React.lazy(() => import('./AddRackForm'));
const EditRackForm = React.lazy(() => import('./EditRackForm'));
const RackDetailModal = React.lazy(() => import('./RackDetailModal'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// --- Icons ---
const BoxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
    <rect x="2" y="4" width="20" height="5" rx="1"/><rect x="2" y="11" width="20" height="5" rx="1"/><rect x="2" y="18" width="20" height="3" rx="1"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const BuildingIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M6 21V7l6-4 6 4v14"/>
  </svg>
);

// --- Utilities ---
const highlightText = (text, query) => {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark style="background:#fef08a;color:#713f12;border-radius:2px;padding:0 1px">$1</mark>');
};

// --- Components ---
function RackCard({ rack, query, onClick }) {
  const visibleItems = rack.items.slice(0, 4);
  const extraCount = rack.items.length - 4;
  return (
    <div onClick={onClick} style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 14, cursor: 'pointer', transition: 'all 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, background: '#eff6ff', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BoxIcon />
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}
          dangerouslySetInnerHTML={{ __html: highlightText(rack.rackNumber, query) }} />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 7px', borderRadius: 20 }}>
          {rack.items.length} items
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {visibleItems.map((item, i) => (
          <span key={i} style={{ fontSize: 11, padding: '3px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 20 }}
            dangerouslySetInnerHTML={{ __html: highlightText(item, query) }} />
        ))}
        {extraCount > 0 && (
          <span style={{ fontSize: 11, padding: '3px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: 20 }}>
            +{extraCount} more
          </span>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 12, height: 100, width: '100%', animation: 'pulse 1.4s ease-in-out infinite' }} />
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

  const fetchRacks = async (pageNum = 1) => {
    if (pageNum === 1) setRacks(null);
    setLoading(true);
    try {
      const response = await axios.get(`${API}/racks`, { params: { page: pageNum, limit: 5 } });
      setRacks(prev => pageNum === 1 ? response.data : { ...prev, ...response.data });
      if (Object.keys(response.data).length < 5) setHasMore(false);
      else setHasMore(true);
      setPage(pageNum);
    } catch (err) { 
      console.error("Fetch failed", err); 
    } finally { 
      setLoading(false); 
    }
  };

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

  const totalRacks = useMemo(() => 
    Object.values(displayRacks).reduce((sum, arr) => sum + arr.length, 0), 
    [displayRacks]
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .rack-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 900px) { .rack-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .rack-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <header style={{ background: '#0f172a', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>Madan Store</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Inventory & Rack Management</div>
          </div>
        </div>
        <button onClick={() => setShowAddForm(true)} style={{
          background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
        onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
          <PlusIcon /> New Rack
        </button>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '20px 20px 40px' }}>
        {/* Search */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search racks or items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: 'white', outline: 'none', color: '#0f172a', transition: 'border-color 0.2s' }}
            />
          </div>
          <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
            {totalRacks} rack{totalRacks !== 1 ? 's' : ''}
          </div>
        </div>

        {/* List Content */}
        {racks === null && loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[1, 2].map(f => (
              <div key={f}>
                <div style={{ width: 100, height: 24, background: '#e2e8f0', borderRadius: 20, marginBottom: 12, animation: 'pulse 1.4s ease-in-out infinite' }} />
                <div className="rack-grid">
                  {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(displayRacks).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#64748b' }}>No results found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Try a different rack number or item name</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(displayRacks).sort().map(([floor, floorRacks]) => (
              <section key={floor}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#1e293b', color: '#cbd5e1', fontSize: 12, fontWeight: 500, borderRadius: 20, marginBottom: 12 }}>
                  <BuildingIcon /> {floor}
                  <span style={{ marginLeft: 2, background: '#334155', padding: '1px 6px', borderRadius: 10, fontSize: 11 }}>{floorRacks.length}</span>
                </div>
                <div className="rack-grid">
                  {floorRacks.map(rack => (
                    <RackCard key={rack.id} rack={rack} query={searchQuery} onClick={() => setViewingRack(rack)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Pagination */}
        {hasMore && !searchQuery && !loading && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button onClick={() => fetchRacks(page + 1)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px 28px', borderRadius: 30, fontSize: 14, cursor: 'pointer', color: '#475569', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              Load more floors
            </button>
          </div>
        )}
        {loading && page > 1 && (
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#94a3b8' }}>Loading floors...</div>
        )}
      </main>

      {/* Modals */}
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.1)', zIndex: 100 }} />}>
        {showAddForm && <AddRackForm setShowAddForm={setShowAddForm} fetchRacks={() => fetchRacks(1)} />}
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