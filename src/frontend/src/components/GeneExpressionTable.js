import React, { useState, useEffect } from 'react';

const GeneExpressionTable = () => {
  const [geneData, setGeneData] = useState(null);
  const [expressionValues, setExpressionValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [geneSearch, setGeneSearch] = useState('');
  const [sampleSearch, setSampleSearch] = useState('');
  const [visibleGenes, setVisibleGenes] = useState(50);
  const [visibleSamples, setVisibleSamples] = useState(10);
  const [downloading, setDownloading] = useState(false);

  const API_BASE_URL = 'http://127.0.0.1:5000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dataResponse, valuesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/data`),
        fetch(`${API_BASE_URL}/expression_values`)
      ]);
      
      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch gene data: ${dataResponse.statusText}`);
      }
      if (!valuesResponse.ok) {
        throw new Error(`Failed to fetch expression values: ${valuesResponse.statusText}`);
      }
      
      const data = await dataResponse.json();
      const values = await valuesResponse.json();
      
      if (!data.genes || !data.samples || !values.expression_values) {
        throw new Error('Invalid data format received from server');
      }

      setGeneData(data);
      setExpressionValues(values.expression_values);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (genes, samples, values) => {
    const header = ['Gene', ...samples];
    
    const rows = genes.map((gene, i) => {
      const geneIndex = geneData.genes.indexOf(gene);
      if (geneIndex === -1 || !expressionValues[geneIndex]) return null;
      
      const rowValues = samples.map(sample => {
        const sampleIndex = geneData.samples.indexOf(sample);
        const value = expressionValues[geneIndex]?.[sampleIndex];
        return typeof value === 'number' ? value.toFixed(4) : 'NA';
      });
      return [gene, ...rowValues];
    }).filter(Boolean);

    return [header, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownload = (dataType) => {
    if (!geneData || !expressionValues) return;
    
    setDownloading(true);
    try {
      const genes = dataType === 'filtered' ? filteredGenes : geneData.genes;
      const samples = dataType === 'filtered' ? filteredSamples : geneData.samples;
      
      const csvContent = convertToCSV(genes, samples, expressionValues);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `gene_expression_${dataType}_${timestamp}.csv`;
      
      downloadCSV(csvContent, fileName);
    } catch (error) {
      console.error('Download error:', error);
      setError('Error during download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        Error: {error}
      </div>
    );
  }

  if (!geneData || !expressionValues || !Array.isArray(expressionValues)) {
    return (
      <div className="p-4 text-gray-600">
        No data available.
      </div>
    );
  }

  const filteredGenes = geneData.genes.filter(gene => 
    gene.toLowerCase().includes(geneSearch.toLowerCase())
  );
  
  const filteredSamples = geneData.samples.filter(sample => 
    sample.toLowerCase().includes(sampleSearch.toLowerCase())
  );

  const currentGenes = filteredGenes.slice(0, visibleGenes);
  const currentSamples = filteredSamples.slice(0, visibleSamples);

  return (
    <div className="p-5">
      {/* Search Controls */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-col gap-4 sm:flex-row">
          <input
            type="text"
            value={geneSearch}
            onChange={(e) => setGeneSearch(e.target.value)}
            placeholder="Search genes..."
            className="flex-1 p-2 border rounded"
          />
          <input
            type="text"
            value={sampleSearch}
            onChange={(e) => setSampleSearch(e.target.value)}
            placeholder="Search samples..."
            className="flex-1 p-2 border rounded"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setVisibleSamples(filteredSamples.length)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Show All Samples ({filteredSamples.length})
          </button>
          <button
            onClick={() => setVisibleGenes(filteredGenes.length)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Show All Genes ({filteredGenes.length})
          </button>
        </div>
      </div>

      {/* Download Section */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-4 border-r pr-4">
            <span className="font-medium">Download Filtered Data:</span>
            <button
              onClick={() => handleDownload('filtered')}
              disabled={downloading}
              className={`px-4 py-2 rounded text-white ${
                downloading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="font-medium">Download Complete Dataset:</span>
            <button
              onClick={() => handleDownload('complete')}
              disabled={downloading}
              className={`px-4 py-2 rounded text-white ${
                downloading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Gene
              </th>
              {currentSamples.map(sample => (
                <th 
                  key={sample}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {sample}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentGenes.map((gene, geneIdx) => {
              const geneIndex = geneData.genes.indexOf(gene);
              if (geneIndex === -1 || !expressionValues[geneIndex]) return null;

              return (
                <tr key={gene} className={geneIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-inherit">
                    {gene}
                  </td>
                  {currentSamples.map((sample, sampleIdx) => {
                    const sampleIndex = geneData.samples.indexOf(sample);
                    const value = expressionValues[geneIndex]?.[sampleIndex];
                    
                    return (
                      <td 
                        key={`${gene}-${sample}`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right"
                      >
                        {typeof value === 'number' ? value.toFixed(2) : 'N/A'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load More Controls */}
      <div className="mt-4 flex justify-center gap-4">
        {visibleSamples < filteredSamples.length && (
          <button
            onClick={() => setVisibleSamples(prev => Math.min(prev + 10, filteredSamples.length))}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Load More Samples (+10)
          </button>
        )}
        {visibleGenes < filteredGenes.length && (
          <button
            onClick={() => setVisibleGenes(prev => Math.min(prev + 50, filteredGenes.length))}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Load More Genes (+50)
          </button>
        )}
      </div>
    </div>
  );
};

export default GeneExpressionTable;
