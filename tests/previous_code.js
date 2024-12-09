import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';



const API_BASE_URL = 'http://127.0.0.1:5000/api';

function App() {
  const [error, setError] = useState(null);

  const GeneExpressionTable = () => {
    const [geneData, setGeneData] = useState(null);
    const [expressionValues, setExpressionValues] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchGeneExpression();
    }, []);

    const fetchGeneExpression = async () => {
      setLoading(true);
      try {
        const dataResponse = await fetch(`${API_BASE_URL}/data`);
        const valuesResponse = await fetch(`${API_BASE_URL}/expression_values`);
        if (!dataResponse.ok || !valuesResponse.ok) throw new Error(`HTTP error!`);
        const data = await dataResponse.json();
        const values = await valuesResponse.json();
        setGeneData(data);
        setExpressionValues(values);
      } catch (error) {
        console.error("Error fetching gene expression data:", error);
        setError(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (loading) return <p>Loading gene expression data...</p>;
    if (!geneData || !expressionValues) return <p>No gene data available.</p>;

    return (
      <div>
        <h2>Gene Expression Table</h2>
        <div style={{ height: '400px', overflowY: 'scroll' }}>
          <table>
            <thead>
              <tr>
                <th>Gene</th>
                {geneData.samples.slice(0, 5).map(sample => <th key={sample}>{sample}</th>)}
              </tr>
            </thead>
            <tbody>
              {geneData.genes.slice(0, 100).map((gene, i) => (
                <tr key={gene}>
                  <td>{gene}</td>
                  {expressionValues[i].slice(0, 5).map((value, j) => (
                    <td key={`${gene}-${j}`}>{value.toFixed(2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  
  const HeatmapWithClustering = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/clustering`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const result = await response.json();
          setData(result);
        } catch (error) {
          console.error("Error fetching clustering data:", error);
          setError(`Error fetching data: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, []);
  
    if (loading) return <div className="text-center p-4">Loading heatmap and clustering data...</div>;
    if (error) return <div className="text-center p-4 text-red-600">{error}</div>;
    if (!data || !data.expression_data || !data.samples || !data.genes) {
      return <div className="text-center p-4">No data available or data is incomplete.</div>;
    }
  
    const getColor = (value) => {
      if (value === undefined || value === null) return 'rgb(200,200,200)';
      const normalizedValue = Math.max(0, Math.min(1, (value + 2) / 4));
      const red = Math.round(255 * (1 - normalizedValue));
      const blue = Math.round(255 * normalizedValue);
      return `rgb(${red},0,${blue})`;
    };
  
    return (
      <div className="w-full max-w-full overflow-x-auto bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Gene Expression Heatmap</h2>
        <div className="relative">
          <table className="w-full border-collapse" style={{ borderSpacing: 0, borderCollapse: 'separate' }}>
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10"></th>
                {data.samples.map((sample, index) => (
                  <th key={index} className="p-0 text-[6px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', height: '80px' }}>
                    {sample}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.expression_data.map((row, i) => (
                <tr key={i}>
                  <td className="sticky left-0 bg-white z-10 p-0 text-[6px] whitespace-nowrap">{data.genes[i]}</td>
                  {row.map((value, j) => (
                    <td key={j} style={{ padding: 0, width: '3px', height: '3px', backgroundColor: getColor(value) }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const TopExpressedGenes = () => {
    const [topExpressed, setTopExpressed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      fetchTopExpressed();
    }, []);
  
    const fetchTopExpressed = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/top_expressed`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("Raw top expressed genes data:", data);
        setTopExpressed(data);
      } catch (error) {
        console.error("Error fetching top expressed genes:", error);
        setError(`Error fetching top expressed genes: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
  
    if (loading) return <p>Loading top expressed genes...</p>;
    if (error) return <p>Error: {error}</p>;
    if (!topExpressed || !topExpressed.genes || !topExpressed['diff_values']) {
      return <p>No data available for top expressed genes.</p>;
    }
  
    const chartData = topExpressed.genes.map((gene, index) => ({
      gene,
      expression: topExpressed['diff_values'][index]
    }));
  
    console.log("Processed chart data:", chartData);
  
    return (
      <div>
        <h2>Top Expressed Genes</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="gene" angle={-45} textAnchor="end" interval={0} height={100} />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Bar dataKey="expression" fill="#8884d8" name="Expression Level" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Router>
      <div className="App">
        <h1>Gene Expression Analysis Dashboard</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/table">Gene Expression Table</Link></li>
            <li><Link to="/heatmap">Heatmap with Clustering</Link></li>
            <li><Link to="/top-expressed">Top Expressed Genes</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<h2>Welcome to the Gene Expression Analysis Dashboard</h2>} />
          <Route path="/table" element={<GeneExpressionTable />} />
          <Route path="/heatmap" element={<HeatmapWithClustering />} />
          <Route path="/top-expressed" element={<TopExpressedGenes />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;