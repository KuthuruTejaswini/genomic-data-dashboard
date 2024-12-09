// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { 
  Table2,
  Grid,
  BarChart2,
  LineChart,
  Upload,
  Network
} from 'lucide-react';
import DashboardLayout from './components/DashboardLayout';
import GeneExpressionTable from './components/GeneExpressionTable';
import HeatmapWithClustering from './components/HeatmapWithClustering';
import TopExpressedGenes from './components/TopExpressedGenes';
import VolcanoPlot from './components/VolcanoPlot';
import UploadDesignFile from './components/UploadDesignFile';
import MetascapeAnalysis from './components/MetascapeAnalysis';
import GenomicTools from './components/GenomicTools';

const HomePage = () => (
  <div className="space-y-8">
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold text-gray-900">Welcome to Gene Expression Analysis</h2>
      <p className="text-xl text-gray-600">
        This dashboard provides comprehensive tools for analyzing gene expression data. 
        Select any feature below to begin your analysis.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gene Expression Table */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
        <Link to="/table" className="block">
          <div className="p-6 bg-blue-50">
            <div className="flex items-center gap-3">
              <Table2 className="w-8 h-8 text-blue-600" />
              <h3 className="text-xl font-semibold text-blue-900">Gene Expression Table</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600">View and filter gene expression data in a tabular format. Features include:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                Search and filter genes and samples
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                Sort data by expression values
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                Download data in CSV format
              </li>
            </ul>
          </div>
        </Link>
      </div>

      {/* Heatmap Clustering */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
        <Link to="/heatmap" className="block">
          <div className="p-6 bg-green-50">
            <div className="flex items-center gap-3">
              <Grid className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-semibold text-green-900">Heatmap Clustering</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600">Visualize expression patterns using interactive heatmaps. Features include:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                Hierarchical clustering visualization
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                Interactive zoom and pan
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                Customizable color schemes
              </li>
            </ul>
          </div>
        </Link>
      </div>

      {/* Top Expressed Genes */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
        <Link to="/top-expressed" className="block">
          <div className="p-6 bg-purple-50">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-purple-600" />
              <h3 className="text-xl font-semibold text-purple-900">Top Expressed Genes</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600">Identify and analyze highly expressed genes. Features include:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                Interactive bar charts
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                Customizable threshold settings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                Statistical analysis tools
              </li>
            </ul>
          </div>
        </Link>
      </div>

      {/* Volcano Plot */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
        <Link to="/volcano-plot" className="block">
          <div className="p-6 bg-orange-50">
            <div className="flex items-center gap-3">
              <LineChart className="w-8 h-8 text-orange-600" />
              <h3 className="text-xl font-semibold text-orange-900">Volcano Plot</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600">Visualize differential expression analysis results. Features include:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                Interactive data points
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                Adjustable significance thresholds
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                Export plot functionality
              </li>
            </ul>
          </div>
        </Link>
      </div>

      {/* Pathway Analysis */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
        <Link to="/pathway-analysis" className="block">
          <div className="p-6 bg-teal-50">
            <div className="flex items-center gap-3">
              <Network className="w-8 h-8 text-teal-600" />
              <h3 className="text-xl font-semibold text-teal-900">Pathway Analysis</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600">Analyze enriched pathways and biological processes. Features include:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-teal-400 rounded-full"></div>
                Identify enriched pathways
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-teal-400 rounded-full"></div>
                Visualize pathway networks
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-teal-400 rounded-full"></div>
                Explore functional enrichment
              </li>
            </ul>
          </div>
        </Link>
      </div>

      {/* Design File Management */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden lg:col-span-2">
        <Link to="/upload-design" className="block">
          <div className="p-6 bg-pink-50">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-pink-600" />
              <h3 className="text-xl font-semibold text-pink-900">Design File Management</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600">Upload and manage experimental design files. Features include:</p>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
                Drag-and-drop file upload
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
                File format validation
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
                Experiment metadata management
              </li>
            </ul>
          </div>
        </Link>
      </div>
    </div>
  </div>
);

const App = () => {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/table" element={<GeneExpressionTable />} />
          <Route path="/heatmap" element={<HeatmapWithClustering />} />
          <Route path="/top-expressed" element={<TopExpressedGenes />} />
          <Route path="/volcano-plot" element={<VolcanoPlot />} />
          <Route path="/pathway-analysis" element={<MetascapeAnalysis />} />
          <Route path="/upload-design" element={<UploadDesignFile />} />
          <Route path="/genomic-tools" element={<GenomicTools />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
};

export default App;