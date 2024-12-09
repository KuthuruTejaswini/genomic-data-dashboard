import React from 'react';

const DAVID = () => {
  const handleOpenDAVID = () => {
    window.open('https://david.ncifcrf.gov/', '_blank', 'noopener,noreferrer,width=1200,height=800');
  };

  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">DAVID: Functional Annotation Analysis</h2>
        <p className="text-gray-600">
          DAVID provides a comprehensive set of functional annotation tools 
          to understand the biological meaning behind large lists of genes.
        </p>
      </div>
      <button
        onClick={handleOpenDAVID}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
      >
        Open DAVID in New Window
      </button>
    </div>
  );
};

export default DAVID;