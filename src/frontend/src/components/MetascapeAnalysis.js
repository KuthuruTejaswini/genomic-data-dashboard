import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Configuration constants
const CONFIG = {
  libraries: [
    { id: 'KEGG_2021_Human', name: 'KEGG Pathways' },
    { id: 'GO_Biological_Process_2021', name: 'GO Biological Process' },
    { id: 'MSigDB_Hallmark_2020', name: 'MSigDB Hallmark' },
    { id: 'WikiPathways_2019_Human', name: 'WikiPathways' },
  ],
  colors: {
    primary: '#4f46e5',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  api: {
    enrichr: 'http://127.0.0.1:5000/api/enrichr_full_analysis', // Updated to backend running on port 5000
  },
  ui: {
    maxDisplayedPathways: 15,
    significanceThreshold: 0.05,
  },
};

const GeneExpressionAnalysis = () => {
  const [analysisState, setAnalysisState] = useState({
    status: 'idle',
    results: null,
    metadata: null,
    error: null,
  });
  const [sortConfig, setSortConfig] = useState({ key: 'combined_score', direction: 'desc' });
  const [selectedLibrary, setSelectedLibrary] = useState(CONFIG.libraries[0].id);

  // Fetch data from the backend
  const fetchData = async (library) => {
    try {
      setAnalysisState((prev) => ({ ...prev, status: 'loading' }));

      const response = await fetch(CONFIG.api.enrichr, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          library: library,
        }),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const textResponse = await response.text();
        console.error('Raw error response:', textResponse);
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }

      const textResponse = await response.text();
      console.log('Raw response:', textResponse);

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('Parse error details:', parseError);
        throw new Error(`Failed to parse response: ${textResponse.substring(0, 100)}...`);
      }

      // Validate response structure
      if (!data || !data.enrichment_results) {
        console.error('Invalid response structure:', data);
        throw new Error('Server response is missing required data.');
      }

      setAnalysisState({
        status: 'complete',
        results: data.enrichment_results,
        metadata: data.metadata,
        error: null,
      });
    } catch (error) {
      console.error('Full error details:', error);
      setAnalysisState({
        status: 'error',
        error: error.message || 'An unexpected error occurred.',
        results: null,
        metadata: null,
      });
    }
  };

  // Fetch data when the selected library changes
  useEffect(() => {
    fetchData(selectedLibrary);
  }, [selectedLibrary]);

  // Sort the enrichment results
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = useMemo(() => {
    if (!analysisState.results) return [];
    const sorted = [...analysisState.results];
    sorted.sort((a, b) => {
      const order = sortConfig.direction === 'asc' ? 1 : -1;
      if (sortConfig.key === 'combined_score') {
        return (a[4] - b[4]) * order; // Combined Score is at index 4
      } else if (sortConfig.key === 'p_value') {
        return (a[2] - b[2]) * order; // P-value is at index 2
      }
      return 0;
    });
    return sorted;
  }, [analysisState.results, sortConfig]);

  const renderTable = () => {
    if (!Array.isArray(sortedResults) || sortedResults.length === 0) {
      return <p className="text-gray-500 text-center py-4">No enrichment results available</p>;
    }

    return (
      <div className="overflow-x-auto shadow-sm rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pathway')}>
                Pathway
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('combined_score')}>
                Combined Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('p_value')}>
                P-value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Genes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedResults.map((result, index) => (
              <tr
                key={index}
                className={result[2] < CONFIG.ui.significanceThreshold ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result[1]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result[4].toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result[2].toExponential(2)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{result[5].join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBarChart = () => {
    if (!Array.isArray(analysisState.results) || analysisState.results.length === 0) return null;

    const pathwaysData = sortedResults
      .slice(0, CONFIG.ui.maxDisplayedPathways)
      .map((result) => ({
        name: result[1],
        combinedScore: result[4],
        pValue: result[2],
      }));

    return (
      <div className="h-[500px] mt-8">
        <h3 className="text-lg font-semibold mb-4">Top {CONFIG.ui.maxDisplayedPathways} Enriched Pathways</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={pathwaysData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 200, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Combined Score', position: 'insideBottom', offset: -10 }} />
            <YAxis dataKey="name" type="category" width={180} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 shadow-lg rounded-lg border">
                      <p className="font-medium">{data.name}</p>
                      <p>Combined Score: {data.combinedScore.toFixed(2)}</p>
                      <p>P-value: {data.pValue.toExponential(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="combinedScore" fill={CONFIG.colors.primary} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Enrichment Analysis</h2>
          <select
            value={selectedLibrary}
            onChange={(e) => setSelectedLibrary(e.target.value)}
            className="border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONFIG.libraries.map((lib) => (
              <option key={lib.id} value={lib.id}>
                {lib.name}
              </option>
            ))}
          </select>
        </div>

        {analysisState.metadata && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Total Genes Analyzed</p>
              <p className="text-2xl font-bold text-blue-900">{analysisState.metadata.total_genes_analyzed}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600">Selected Database</p>
              <p className="text-2xl font-bold text-purple-900">{analysisState.metadata.library_used}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Analysis Timestamp</p>
              <p className="text-lg font-bold text-green-900">
                {new Date(analysisState.metadata?.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {analysisState.status === 'loading' ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : analysisState.error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">
            Error: {analysisState.error}
          </div>
        ) : (
          <>
            {renderTable()}
            {renderBarChart()}
          </>
        )}
      </div>
    </div>
  );
};

export default GeneExpressionAnalysis;
