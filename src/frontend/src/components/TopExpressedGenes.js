// src/frontend/src/components/TopExpressedGenes.js
import React, { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react'; // If you're using lucide-react icons

const TopExpressedGenes = () => {
  const [topExpressed, setTopExpressed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [numGenes, setNumGenes] = useState(10);

  useEffect(() => {
    fetchTopExpressed();
  }, [numGenes]);

  const fetchTopExpressed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/top-expressed?top_n=${numGenes}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTopExpressed(data);
    } catch (error) {
      console.error("Error fetching top expressed genes:", error);
      setError(`Error fetching top expressed genes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
      <div className="p-6 bg-purple-50">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-8 h-8 text-purple-600" />
          <h3 className="text-xl font-semibold text-purple-900">
            Top Expressed Genes
          </h3>
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing top {numGenes} differentially expressed genes
          </p>
          <select
            value={numGenes}
            onChange={(e) => setNumGenes(Number(e.target.value))}
            className="block w-24 rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            disabled={loading}
          >
            <option value={5}>5 genes</option>
            <option value={10}>10 genes</option>
            <option value={20}>20 genes</option>
            <option value={50}>50 genes</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : topExpressed ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gene
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Log2 FC
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P-value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adj. P-value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regulation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topExpressed.top_genes?.map((gene, index) => (
                  <tr key={gene.gene} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {gene.gene}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(gene.log2_fold_change).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(gene.p_value).toExponential(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(gene.adjusted_p_value).toExponential(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      gene.regulation === 'up' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {gene.regulation === 'up' ? '▲ Up' : '▼ Down'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-12">
            No results available
          </div>
        )}
      </div>
    </div>
  );
};

export default TopExpressedGenes;