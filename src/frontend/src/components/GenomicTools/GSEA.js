import React from 'react';

const GSEA = () => {
    const handleOpenGSEA = () => {
      window.open('https://www.gsea-msigdb.org/gsea/index.jsp', '_blank', 'noopener,noreferrer,width=1200,height=800');
    };
  
    return (
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">GSEA: Gene Set Enrichment Analysis</h2>
          <p className="text-gray-600">
            Gene Set Enrichment Analysis (GSEA) is a computational method that determines whether 
            an a priori defined set of genes shows statistically significant differences between 
            two biological states.
          </p>
        </div>
        <button
          onClick={handleOpenGSEA}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
        >
          Open GSEA in New Window
        </button>
      </div>
    );
  };
export default GSEA;