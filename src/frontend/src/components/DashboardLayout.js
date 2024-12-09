// src/components/DashboardLayout.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home,
  Table2,
  Grid,
  BarChart2,
  LineChart,
  Upload,
  Network,
  Menu,
  ExternalLink,
  Info,
  Database
} from 'lucide-react';

const features = [
  {
    name: 'Gene Expression Table',
    href: '/table',
    icon: Table2,
    color: 'blue',
    description: 'View and filter gene expression data in a tabular format.',
    image: '/images/gene-table.png',
    features: [
      'Search and filter genes and samples',
      'Sort data by expression values',
      'Download data in CSV format',
      'Interactive filtering and pagination'
    ],
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-100'
  },
  {
    name: 'Heatmap Clustering',
    href: '/heatmap',
    icon: Grid,
    color: 'green',
    description: 'Visualize expression patterns using interactive heatmaps.',
    image: '/images/heatmap.png',
    features: [
      'Hierarchical clustering visualization',
      'Interactive zoom and pan',
      'Customizable color schemes',
      'Export high-resolution images'
    ],
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-100'
  },
  {
    name: 'Top Expressed Genes',
    href: '/top-expressed',
    icon: BarChart2,
    color: 'purple',
    description: 'Identify and analyze highly expressed genes.',
    image: '/images/top-genes.png',
    features: [
      'Interactive bar charts',
      'Customizable threshold settings',
      'Statistical analysis tools',
      'Export results and visualizations'
    ],
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:bg-purple-100'
  },
  {
    name: 'Volcano Plot',
    href: '/volcano-plot',
    icon: LineChart,
    color: 'orange',
    description: 'Visualize differential expression analysis results.',
    image: '/images/volcano-plot.png',
    features: [
      'Interactive data points',
      'Adjustable significance thresholds',
      'Export plot functionality',
      'Custom annotation options'
    ],
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    hoverColor: 'hover:bg-orange-100'
  },
  {
    name: 'Pathway Analysis',
    href: '/pathway-analysis',
    icon: Network,
    color: 'teal',
    description: 'Analyze enriched pathways and biological processes.',
    image: '/images/pathway-analysis.png',
    features: [
      'Identify enriched pathways',
      'Visualize pathway networks',
      'Explore functional enrichment',
      'Interactive network manipulation'
    ],
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-600',
    borderColor: 'border-teal-200',
    hoverColor: 'hover:bg-teal-100'
  },
  {
    name: 'Design File Management',
    href: '/upload-design',
    icon: Upload,
    color: 'pink',
    description: 'Upload and manage experimental design files.',
    image: '/images/file-upload.png',
    features: [
      'Drag-and-drop file upload',
      'File format validation',
      'Experiment metadata management',
      'Batch processing support'
    ],
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
    hoverColor: 'hover:bg-pink-100'
  },
  {
    name: ' Other Genomic Tools',
    href: '/genomic-tools',
    icon: Database, // Import Database from lucide-react
    color: 'indigo',
    description: 'Analyze genes using external genomic analysis tools.',
    image: '/images/genomic-tools.png',
    features: [
      'STRING protein interaction networks',
      'GSEA pathway enrichment analysis',
      'DAVID functional annotation',
      'GeneMANIA gene function prediction'
    ],
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    hoverColor: 'hover:bg-indigo-100'
  }
];

const FeatureSection = ({ feature }) => (
    <div className={`border rounded-lg p-4 bg-gradient-to-r from-${feature.color}-50 to-${feature.color}-100 flex justify-between items-center shadow-md hover:shadow-lg transition-shadow duration-300`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <feature.icon className={`w-5 h-5 transform transition-transform duration-200 hover:scale-105 ${feature.textColor}`} />
          <h3 className="text-lg font-semibold">{feature.name}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
        <ul className="space-y-2">
          {feature.features.map((item, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <div className={`w-1.5 h-1.5 rounded-full ${feature.textColor}`} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {feature.image && (
        <div className="flex-shrink-0 w-[150px] h-[150px] ml-4 border border-gray-300 rounded-lg shadow-sm">
          <img
            src={feature.image}
            alt={`${feature.name} preview`}
            className="w-full h-full object-contain rounded-lg"
            style={{
              maxWidth: '150px',
              maxHeight: '150px',
              minWidth: '150px',
              minHeight: '150px'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
  
  
  
  const HomePage = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Gene Expression Analysis
        </h2>
        <p className="text-gray-600">
          This dashboard provides comprehensive tools for analyzing gene expression data. 
          Select any feature below to begin your analysis.
        </p>
      </div>
  
      <div className="space-y-4">
        {features.map((feature, index) => (
          <Link to={feature.href} key={index} className="block hover:opacity-90 transition-opacity">
            <FeatureSection feature={feature} />
          </Link>
        ))}
      </div>
    </div>
  );

const DashboardLayout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
          ${isActive ? item.bgColor + ' ' + item.textColor : 'text-gray-600'}
          ${item.hoverColor}`}
        onClick={() => setIsMenuOpen(false)}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-200 
        ${isMenuOpen ? 'block fixed h-full z-50 md:relative' : 'hidden'} md:block`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <Link to="/" className="text-xl font-semibold">
            Gene Expression
          </Link>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {features.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1">
        <header className="h-16 border-b bg-white">
          <div className="h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="font-semibold text-lg">
                {features.find(f => f.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-md hover:bg-gray-100"
                title="Help & Information"
              >
                <Info className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {location.pathname === '/' ? <HomePage /> : children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;