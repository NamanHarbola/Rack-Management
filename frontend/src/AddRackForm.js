import React, { useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AddRackForm = ({ setShowAddForm, fetchRacks }) => {
  const [formData, setFormData] = useState({ rackNumber: "", floor: "", items: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsList = formData.items.split(",").map(i => i.trim()).filter(Boolean);
    await axios.post(`${API}/racks`, { ...formData, items: itemsList });
    setShowAddForm(false);
    fetchRacks();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60">
      <div className="bg-[#111827] w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-10">
          <header className="mb-8">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <span className="text-2xl">📦</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">New Storage Rack</h2>
            <p className="text-slate-400 text-sm mt-1">Assign a new location to your inventory.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-1">Rack Identity</label>
              <input 
                required
                className="w-full mt-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. RACK-A1"
                onChange={e => setFormData({...formData, rackNumber: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-1">Floor Level</label>
              <select 
                className="w-full mt-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 transition-all"
                onChange={e => setFormData({...formData, floor: e.target.value})}
              >
                <option value="Ground">Ground Floor</option>
                <option value="1st">1st Floor</option>
                <option value="2nd">2nd Floor</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-1">Initial Items</label>
              <textarea 
                className="w-full mt-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 min-h-[100px] outline-none focus:border-indigo-500 transition-all"
                placeholder="Bulbs, Wires, Switches (comma separated)"
                onChange={e => setFormData({...formData, items: e.target.value})}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-4 rounded-2xl text-slate-400 font-semibold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                Save Location
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRackForm; 