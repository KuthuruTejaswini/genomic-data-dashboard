import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const HeatmapWithClustering = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const heatmapRef = useRef();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/clustering`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching clustering data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const drawHeatmap = () => {
    if (!data || !data.expression_data || !data.genes || !data.samples) {
      console.error("Heatmap data is missing or incomplete:", data);
      return;
    }

    // Clear previous SVG elements
    d3.select(heatmapRef.current).selectAll('*').remove();

    // Substantially increased margins
    const margin = {
      top: 200,     // Much larger top margin for sample labels
      right: 100,   // Larger right margin
      bottom: 80,   // Larger bottom margin
      left: 250     // Much larger left margin for gene labels
    };
    
    // Significantly increased base dimensions
    const width = 2400 - margin.left - margin.right;    // Much larger width
    const height = 1800 - margin.top - margin.bottom;   // Much larger height
    
    const numGenes = data.genes.length;
    const numSamples = data.samples.length;

    // Increased minimum cell sizes
    const cellWidth = Math.max(12, width / numSamples);    // Larger minimum cell width
    const cellHeight = Math.max(12, height / numGenes);    // Larger minimum cell height

    // Create SVG with larger viewBox
    const svg = d3.select(heatmapRef.current)
      .append('svg')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add zoom behavior with adjusted boundaries
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });

    d3.select(heatmapRef.current).select('svg')
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

    const { expression_data, genes, samples } = data;

    // Enhanced color scale with better contrast
    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
      .domain([2, -2]);

    // Enhanced tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "solid 1px #ccc")
      .style("border-radius", "6px")
      .style("padding", "12px")
      .style("pointer-events", "none")
      .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)")
      .style("font-size", "14px")
      .style("line-height", "1.5");

    // Draw heatmap cells
    svg.selectAll('rect')
      .data(expression_data.flat().map((value, i) => ({
        row: Math.floor(i / samples.length),
        col: i % samples.length,
        value,
        gene: genes[Math.floor(i / samples.length)],
        sample: samples[i % samples.length]
      })))
      .enter().append('rect')
      .attr('x', d => d.col * cellWidth)
      .attr('y', d => d.row * cellHeight)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .style('fill', d => colorScale(d.value))
      .style('stroke-width', 0.5)
      .style('stroke', '#fff')
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">
            Gene: ${d.gene}
          </div>
          <div style="margin-bottom: 4px;">
            Sample: ${d.sample}
          </div>
          <div>
            Value: ${d.value.toFixed(2)}
          </div>
        `)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 15}px`);
      })
      .on('mouseout', () => {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Add gene labels with improved visibility
    svg.selectAll('.geneLabel')
      .data(genes)
      .enter().append('text')
      .attr('class', 'geneLabel')
      .attr('x', -10)
      .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
      .style('text-anchor', 'end')
      .style('dominant-baseline', 'middle')
      .style('font-size', `${Math.min(cellHeight * 0.9, 14)}px`)
      .style('font-family', 'Arial, sans-serif')
      .style('font-weight', '500')
      .text(d => d);

    // Add sample labels with improved visibility
    svg.selectAll('.sampleLabel')
      .data(samples)
      .enter().append('text')
      .attr('class', 'sampleLabel')
      .attr('x', 0)
      .attr('y', 0)
      .style('text-anchor', 'start')
      .style('font-size', `${Math.min(cellWidth * 0.9, 14)}px`)
      .style('font-family', 'Arial, sans-serif')
      .style('font-weight', '500')
      .attr('transform', (d, i) => {
        const x = i * cellWidth + cellWidth / 2;
        return `translate(${x}, -10) rotate(-45)`;
      })
      .text(d => d);

    // Add color scale legend with larger dimensions
    const legendWidth = 300;  // Increased legend width
    const legendHeight = 30;  // Increased legend height
    
    const legendScale = d3.scaleLinear()
      .domain([-2, 2])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format(".1f"));
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - legendWidth - 50}, ${-margin.top/2})`);
    
    const legendGradient = legend.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    legendGradient.selectAll('stop')
      .data(d3.range(-2, 2.1, 0.1))
      .enter().append('stop')
      .attr('offset', (d, i) => `${(i / 40) * 100}%`)
      .attr('stop-color', d => colorScale(d));
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)')
      .style('stroke', '#ccc')
      .style('stroke-width', '1px');
    
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '12px');
    
    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -10)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Expression Z-score');
  };

  useEffect(() => {
    if (data) {
      drawHeatmap();
    }
  }, [data]);

  return (
    <div className="w-full min-h-screen p-8">
      <h2 className="text-3xl font-semibold mb-8">Heatmap with Clustering</h2>
      {loading && (
        <div className="text-gray-600 text-xl flex items-center justify-center h-32">
          Loading heatmap data...
        </div>
      )}
      {error && (
        <div className="text-red-600 text-xl bg-red-50 p-4 rounded-lg mb-4">
          Error: {error}
        </div>
      )}
      <div 
        ref={heatmapRef} 
        className="w-full border border-gray-200 rounded-lg shadow-lg bg-white p-8"
        style={{
          height: '1200px',
          minHeight: '1200px',
          maxWidth: '100%',
          margin: '0 auto',
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default HeatmapWithClustering;