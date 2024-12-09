import React from 'react';

const StringDB = () => {
  const handleOpenString = () => {
    window.open('https://string-db.org/', '_blank', 'noopener,noreferrer,width=1200,height=800');
  };

  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">STRING: Protein-Protein Interaction Network</h2>
        <p className="text-gray-600">
          STRING is a database of known and predicted protein-protein interactions. 
          The interactions include direct (physical) and indirect (functional) associations.
        </p>
      </div>
      <button
        onClick={handleOpenString}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
      >
        Open STRING DB in New Window
      </button>
    </div>
  );
};

export default StringDB;