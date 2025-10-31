import React from "react";

const RackDetailModal = ({ 
  rack, 
  setViewingRack, 
  setEditingRack, 
  searchQuery, 
  searchResults, 
  highlightText 
}) => {
  
  const matchedItems = (searchResults && searchResults.matchedItems && searchResults.matchedItems[rack.id]) || [];
  
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
              {matchedItems..map((item, index) => (
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

export default RackDetailModal;
