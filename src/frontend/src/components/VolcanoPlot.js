import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const VolcanoPlot = () => {
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);

  useEffect(() => {
    fetchVolcanoData();
  }, []);

  const fetchVolcanoData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/deseq2`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform the data for the volcano plot
      const transformedData = {
        x: data.map(d => d.log2_fold_change),
        y: data.map(d => -Math.log10(d.p_value)),
        genes: data.map(d => d.gene),
        colors: data.map(d => {
          const isSignificant = d.p_value < 0.05 && Math.abs(d.log2_fold_change) > 1;
          if (isSignificant) {
            return d.log2_fold_change > 0 ? '#ff0000' : '#0000ff';
          }
          return '#808080';
        })
      };

      setPlotData(transformedData);
    } catch (error) {
      console.error("Error fetching volcano plot data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
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
        Error loading volcano plot: {error}
      </div>
    );
  }

  if (!plotData) {
    return (
      <div className="p-4 text-gray-600">
        No data available for volcano plot.
      </div>
    );
  }

  const plotlyData = [{
    x: plotData.x,
    y: plotData.y,
    mode: 'markers',
    type: 'scatter',
    text: plotData.genes,
    marker: {
      color: plotData.colors,
      size: 8,
      opacity: 0.7
    },
    hovertemplate:
      '<b>Gene:</b> %{text}<br>' +
      '<b>Log2 Fold Change:</b> %{x:.2f}<br>' +
      '<b>-Log10 P-value:</b> %{y:.2f}<br>' +
      '<extra></extra>'
  }];

  const layout = {
    title: {
      text: 'Volcano Plot',
      font: { size: 24 }
    },
    xaxis: {
      title: {
        text: 'log2 Fold Change',
        font: { size: 14 }
      },
      zeroline: true,
      zerolinecolor: '#969696',
      gridcolor: '#f0f0f0',
    },
    yaxis: {
      title: {
        text: '-log10(p-value)',
        font: { size: 14 }
      },
      gridcolor: '#f0f0f0',
    },
    hovermode: 'closest',
    shapes: [
      // Add threshold lines
      {
        type: 'line',
        x0: -1,
        x1: -1,
        y0: 0,
        y1: Math.max(...plotData.y),
        line: {
          color: 'grey',
          width: 1,
          dash: 'dash'
        }
      },
      {
        type: 'line',
        x0: 1,
        x1: 1,
        y0: 0,
        y1: Math.max(...plotData.y),
        line: {
          color: 'grey',
          width: 1,
          dash: 'dash'
        }
      },
      {
        type: 'line',
        x0: Math.min(...plotData.x),
        x1: Math.max(...plotData.x),
        y0: -Math.log10(0.05),
        y1: -Math.log10(0.05),
        line: {
          color: 'grey',
          width: 1,
          dash: 'dash'
        }
      }
    ],
    showlegend: false,
    paper_bgcolor: 'white',
    plot_bgcolor: 'white',
    width: 800,
    height: 600,
    margin: {
      l: 60,
      r: 30,
      b: 60,
      t: 80,
      pad: 4
    }
  };

  const config = {
    displayModeBar: true,
    responsive: true,
    scrollZoom: true,
    modeBarButtonsToAdd: ['select2d', 'lasso2d']
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Differential Expression Analysis</h2>
        <div className="mb-4">
          <div className="text-gray-600">
            <div>{"Red points: Significantly upregulated genes (log2FC > 1, p < 0.05)"}</div>
            <div>{"Blue points: Significantly downregulated genes (log2FC < -1, p < 0.05)"}</div>
            <div>{"Gray points: Non-significant changes"}</div>
          </div>
        </div>
        <Plot
          data={plotlyData}
          layout={layout}
          config={config}
          onSelected={(eventData) => {
            if (eventData?.points) {
              setSelectedPoints(eventData.points.map(point => ({
                gene: plotData.genes[point.pointIndex],
                log2FC: plotData.x[point.pointIndex],
                pValue: plotData.y[point.pointIndex]
              })));
            }
          }}
        />
        {selectedPoints.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Selected Genes:</h3>
            <div className="max-h-40 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gene</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Log2 FC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">-Log10 P-value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedPoints.map((point, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{point.gene}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{point.log2FC.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{point.pValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolcanoPlot;