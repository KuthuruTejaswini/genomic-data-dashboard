import React from 'react';

const GeneMANIA = () => {
    const handleOpenGeneMANIA = () => {
      window.open('https://genemania.org/', '_blank', 'noopener,noreferrer,width=1200,height=800');
    };
  
    return (
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">GeneMANIA: Gene Function Prediction</h2>
          <p className="text-gray-600">
            GeneMANIA helps you predict the function of your favorite genes and find new members 
            of a pathway or complex. It shows functional associations between genes based on multiple 
            networks.
          </p>
        </div>
        <button
          onClick={handleOpenGeneMANIA}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
        >
          Open GeneMANIA in New Window
        </button>
      </div>
    );
  };
  export default GeneMANIA;