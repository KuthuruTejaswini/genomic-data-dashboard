import React, { useState } from 'react';
import StringDB from './StringDB';
import DAVID from './DAVID';
import GSEA from './GSEA';
import GeneMANIA from './GeneMANIA';

const tabs = [
  { id: 'string', name: 'STRING DB', color: 'blue' },
  { id: 'david', name: 'DAVID', color: 'purple' },
  { id: 'gsea', name: 'GSEA', color: 'green' },
  { id: 'genemania', name: 'GeneMANIA', color: 'indigo' }
];

const GenomicTools = () => {
  const [activeTab, setActiveTab] = useState('string');

  return (
    <div className="p-6 space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`
              flex-1 px-4 py-3 rounded-lg font-medium transition-all
              ${activeTab === tab.id 
                ? `bg-white shadow text-${tab.color}-600` 
                : 'text-gray-600 hover:bg-white/60'}
            `}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tool Display */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        {activeTab === 'string' && <StringDB />}
        {activeTab === 'david' && <DAVID />}
        {activeTab === 'gsea' && <GSEA />}
        {activeTab === 'genemania' && <GeneMANIA />}
      </div>
    </div>
  );
};

export default GenomicTools;