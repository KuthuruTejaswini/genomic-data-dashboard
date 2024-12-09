// src/config/apiConfig.js
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000'  // Flask backend URL
  : '/api';  // Production URL

export const ENRICHR_CONFIG = {
  supported_libraries: {
    KEGG_2021_Human: 'KEGG Pathways',
    GO_Biological_Process_2021: 'GO Biological Process',
    MSigDB_Hallmark_2020: 'MSigDB Hallmark',
    WikiPathways_2019_Human: 'WikiPathways'
  }
};

export const API_ENDPOINTS = {
  enrichr: `${API_BASE_URL}/api/enrichr_full_analysis`,
  deseq2: `${API_BASE_URL}/api/deseq2`,
  topGenes: `${API_BASE_URL}/api/top-expressed`,
  volcanoPlot: `${API_BASE_URL}/api/volcano_plot`,
};

export default API_ENDPOINTS;