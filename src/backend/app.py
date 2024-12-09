from platform import processor
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_caching import Cache
import pandas as pd
import numpy as np
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import pdist
from scipy import stats
import json
import logging
import datetime
import time
import os
import requests
from typing import List, Dict, Any
from requests.exceptions import HTTPError
from werkzeug.utils import secure_filename
from config import (
    DEFAULT_TOP_N_GENES,
    GENOMIC_TOOLS,
    TOOL_PATHS
)
from utils import (
    create_response,
    get_cached_results,
    save_tool_results,
    validate_genes,
)

from config import DEFAULT_TOP_N_GENES
from data_processor import DataProcessor

# Enhanced logging setup
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

GENOMIC_TOOL_URLS = {
    'string': 'https://string-db.org/',
    'david': 'https://david.ncifcrf.gov/',
    'gsea': 'https://www.gsea-msigdb.org/gsea/index.jsp',
    'genemania': 'https://genemania.org/'
}

# Get absolute path to data directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, 'data')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"],
        "supports_credentials": True
    }
})

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.errorhandler(400)
def bad_request(e):
    return jsonify(error=str(e)), 400

@app.errorhandler(500)
def server_error(e):
    return jsonify(error=str(e)), 500

@app.errorhandler(Exception)
def handle_exception(e):
    logger.exception("Unhandled exception: %s", str(e))
    return jsonify(error="An unexpected error occurred"), 500

# Initialize DataProcessor
data_processor = DataProcessor()

# Constants
MAX_RETRIES = 3
DELAY_BETWEEN_RETRIES = 5
ENRICHR_ADD_LIST_URL = 'https://maayanlab.cloud/Enrichr/addList'
ENRICHR_ENRICH_URL = 'https://maayanlab.cloud/Enrichr/enrich'

def get_data_path(filename):
    """Helper function to get the correct data file path"""
    path = os.path.join(DATA_DIR, filename)
    logging.debug(f"Accessing file: {path}")
    return path

def extract_significant_genes():
    """Extract significant genes with improved filtering"""
    try:
        deseq2_file = get_data_path("deseq2_results.json")
        if not os.path.exists(deseq2_file):
            raise FileNotFoundError("DESeq2 results file not found")

        with open(deseq2_file, 'r') as f:
            deseq2_results = json.load(f)

        # Add validation of DESeq2 results
        if not isinstance(deseq2_results, list):
            raise ValueError("Invalid DESeq2 results format")

        # More stringent filtering
        significant_genes = []
        for gene in deseq2_results:
            if not all(k in gene for k in ['gene', 'adjusted_p_value', 'log2_fold_change']):
                continue
                
            if (gene['adjusted_p_value'] is not None and 
                gene['log2_fold_change'] is not None and
                gene['adjusted_p_value'] < 0.05 and 
                abs(gene['log2_fold_change']) > 1):
                significant_genes.append(str(gene['gene']))

        logging.info(f"Found {len(significant_genes)} significant genes")
        return significant_genes

    except Exception as e:
        logging.error(f"Error extracting significant genes: {str(e)}", exc_info=True)
        return []

def submit_to_enrichr(payload):
    retries = 0
    while retries < MAX_RETRIES:
        try:
            response = requests.post(ENRICHR_ADD_LIST_URL, files=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except HTTPError as e:
            if response.status_code == 429:
                retries += 1
                time.sleep(DELAY_BETWEEN_RETRIES)
                continue
            raise e
    raise Exception("Max retries exceeded for Enrichr submission.")

@app.route('/api/debug-paths', methods=['GET'])
def debug_paths():
    try:
        count_file = data_processor.data_dir / "raw_counts.csv"
        design_file = data_processor.data_dir / "experiment_design.csv"
        
        return jsonify({
            'data_directory': str(data_processor.data_dir),
            'r_script_path': str(data_processor.r_script_path),
            'files_exist': {
                'data_dir': data_processor.data_dir.exists(),
                'raw_counts.csv': count_file.exists(),
                'experiment_design.csv': design_file.exists(),
                'r_script': data_processor.r_script_path.exists()
            },
            'data_dir_contents': os.listdir(data_processor.data_dir) if data_processor.data_dir.exists() else []
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data')
def get_data():
    try:
        log_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        data_dict = {
            'genes': log_data.index.tolist(),
            'samples': log_data.columns.tolist()
        }
        return jsonify(data_dict)
    except Exception as e:
        logging.error(f"Error in get_data: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/expression_values', methods=['GET'])
def get_expression_values():
    try:
        log_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        expression_values = log_data.values.tolist()
        return jsonify({'expression_values': expression_values})
    except Exception as e:
        logging.error(f"Error in get_expression_values: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/top-expressed', methods=['GET'])
def get_top_expressed():
    try:
        # Get number of genes from query parameter
        top_n = request.args.get('top_n', default=DEFAULT_TOP_N_GENES, type=int)
        
        # Check if DESeq2 results exist, if not run the analysis
        deseq2_results_path = data_processor.data_dir / "deseq2_results.json"
        if not deseq2_results_path.exists():
            success = data_processor.run_deseq2_analysis()
            if not success:
                return jsonify({'error': 'Failed to run DESeq2 analysis'}), 500
        
        # Get top expressed genes
        results = data_processor.get_top_expressed_genes(top_n=top_n)
        
        return jsonify(results)
        
    except FileNotFoundError as e:
        app.logger.error(f"File not found: {str(e)}")
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        app.logger.error(f"Error in top_expressed endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/clustering', methods=['GET'])
def get_clustering():
    try:
        # Load expression data
        log_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        logging.info(f"Loaded expression data shape: {log_data.shape}")

        # Filter top variable genes
        top_n_genes = int(request.args.get('top_n_genes', 500))
        filtered_data = data_processor.filter_top_variable_genes(log_data, top_n=top_n_genes)
        logging.info(f"Filtered data shape: {filtered_data.shape}")

        # Normalize with Z-scores
        zscore_data = pd.DataFrame(
            stats.zscore(filtered_data, axis=1),
            index=filtered_data.index,
            columns=filtered_data.columns
        )

        # Perform hierarchical clustering
        gene_distances = pdist(zscore_data.values, metric='correlation')
        sample_distances = pdist(zscore_data.values.T, metric='correlation')

        gene_linkage = linkage(gene_distances, method='average')
        sample_linkage = linkage(sample_distances, method='average')

        gene_dendrogram = dendrogram(gene_linkage, no_plot=True)
        sample_dendrogram = dendrogram(sample_linkage, no_plot=True)

        reordered_data = zscore_data.iloc[
            gene_dendrogram['leaves'],
            sample_dendrogram['leaves']
        ]

        result = {
            'expression_data': reordered_data.values.tolist(),
            'genes': reordered_data.index.tolist(),
            'samples': reordered_data.columns.tolist(),
            'metadata': {
                'total_genes': len(log_data.index),
                'filtered_shape': [reordered_data.shape[0], reordered_data.shape[1]]
            }
        }

        return jsonify(result)
    except Exception as e:
        logging.error(f"Error in clustering: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'data_dir': DATA_DIR,
            'files_available': os.listdir(DATA_DIR) if os.path.exists(DATA_DIR) else []
        }), 500

@app.route('/api/design_info')
def get_design_info():
    try:
        design_file = get_data_path("experiment_design.csv")
        if not os.path.exists(design_file):
            return jsonify({"error": "Design file not found"}), 404
            
        design_data = pd.read_csv(design_file)
        
        if not all(col in design_data.columns for col in ['sample', 'condition']):
            return jsonify({"error": "Invalid design file format"}), 400
            
        condition_counts = design_data['condition'].value_counts().to_dict()
        
        result = {
            'samples': design_data.to_dict('records'),
            'conditions': list(design_data['condition'].unique()),
            'condition_counts': condition_counts,
            'total_samples': len(design_data)
        }
        
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error fetching design info: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload/raw_counts', methods=['POST'])
def upload_raw_counts():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "Invalid file type. Please upload a CSV file"}), 400

        try:
            df = pd.read_csv(file, index_col=0)
        except Exception as e:
            return jsonify({"error": f"Error reading file: {str(e)}"}), 400

        success, message, results = data_processor.process_upload(df)
        if not success:
            return jsonify({"error": message}), 400

        raw_counts_path = get_data_path('raw_counts.csv')
        log_data_path = get_data_path('log_transformed_data.csv')
        
        results['raw_filtered'].to_csv(raw_counts_path)
        results['log_transformed'].to_csv(log_data_path)

        return jsonify({
            "message": "Raw counts file processed successfully",
            "summary": results['summary']
        }), 200

    except Exception as e:
        logging.error(f"Error in upload_raw_counts: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload_design', methods=['POST'])
def upload_design():
    try:
        if 'design_file' not in request.files:
            return jsonify({"error": "No design file provided"}), 400
        
        file = request.files['design_file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "Invalid file type. Please upload a CSV file"}), 400

        df = pd.read_csv(file)
        
        if not all(col in df.columns for col in ['sample', 'condition']):
            return jsonify({"error": "Invalid file format. File must contain 'sample' and 'condition' columns"}), 400
            
        if df['sample'].duplicated().any():
            return jsonify({"error": "Duplicate sample names found in design file"}), 400
        
        expression_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        missing_samples = set(df['sample']) - set(expression_data.columns)
        if missing_samples:
            return jsonify({
                "error": f"Some samples in design file not found in expression data: {', '.join(missing_samples)}"
            }), 400

        design_file_path = get_data_path("experiment_design.csv")
        df.to_csv(design_file_path, index=False)
        
        return jsonify({
            "message": "Design file uploaded successfully",
            "summary": {
                "total_samples": len(df),
                "conditions": df['condition'].unique().tolist(),
                "samples_per_condition": df['condition'].value_counts().to_dict()
            }
        }), 200

    except Exception as e:
        logging.error(f"Error uploading design file: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/deseq2', methods=['GET'])
def get_deseq2_results():
    try:
        deseq2_file = get_data_path("deseq2_results.json")
        if not os.path.exists(deseq2_file):
            return jsonify({"error": "DESeq2 results file not found"}), 404

        with open(deseq2_file, 'r') as f:
            deseq2_results = json.load(f)
            
        return jsonify(deseq2_results)
        
    except Exception as e:
        logging.error(f"Error in get_deseq2_results: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/volcano_plot', methods=['GET'])
def get_volcano_plot():
    try:
        deseq2_file = get_data_path("deseq2_results.json")
        if not os.path.exists(deseq2_file):
            return jsonify({"error": "DESeq2 results file not found"}), 404
        
        # Load DESeq2 results
        with open(deseq2_file, 'r') as f:
            deseq2_results = pd.DataFrame(json.load(f))
        
        # Prepare volcano plot data
        volcano_data = {
            'log2_fold_change': deseq2_results['log2_fold_change'].tolist(),
            'p_value': deseq2_results['p_value'].tolist(),
            'gene': deseq2_results['gene'].tolist()
        }
        
        return jsonify(volcano_data)
        
    except Exception as e:
        logging.error(f"Error in get_volcano_plot: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/api/enrichr_full_analysis', methods=['POST'])
def run_enrichr_analysis():
    try:
        # Validate request data
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        library = data.get('library')
        if not library:
            return jsonify({"error": "Missing library parameter"}), 400

        # Extract significant genes
        significant_genes = extract_significant_genes()
        if not significant_genes:
            return jsonify({
                "enrichment_results": [],
                "metadata": {
                    "total_genes_analyzed": 0,
                    "library_used": library,
                    "timestamp": datetime.datetime.now().isoformat()
                }
            }), 200

        genes_str = '\n'.join(significant_genes)

        # Submit to Enrichr
        enrichr_response = requests.post(
            'https://maayanlab.cloud/Enrichr/addList',
            files={
                'list': (None, genes_str),
                'description': (None, 'Gene list')
            }
        )
        if enrichr_response.status_code != 200:
            logging.error(f"Failed to submit gene list: {enrichr_response.status_code}")
            return jsonify({
                "error": f"Enrichr API returned status {enrichr_response.status_code}",
                "details": enrichr_response.text
            }), 500

        try:
            enrichr_data = enrichr_response.json()
        except ValueError:
            logging.error(f"Unexpected Enrichr response: {enrichr_response.text}")
            return jsonify({
                "error": "Enrichr API returned an unexpected response",
                "details": enrichr_response.text
            }), 500

        user_list_id = enrichr_data.get('userListId')
        if not user_list_id:
            return jsonify({"error": "No userListId received from Enrichr"}), 500

        # Get enrichment results
        results_url = f"https://maayanlab.cloud/Enrichr/enrich?userListId={user_list_id}&backgroundType={library}"
        results_response = requests.get(results_url)
        if results_response.status_code != 200:
            return jsonify({
                "error": f"Enrichr API enrichment failed: {results_response.status_code}",
                "details": results_response.text
            }), 500

        try:
            enrichment_results = results_response.json()
        except ValueError:
            logging.error(f"Unexpected enrichment results: {results_response.text}")
            return jsonify({
                "error": "Unexpected enrichment results from Enrichr",
                "details": results_response.text
            }), 500

        # Format response
        return jsonify({
            "enrichment_results": enrichment_results.get(library, []),
            "metadata": {
                "total_genes_analyzed": len(significant_genes),
                "library_used": library,
                "timestamp": datetime.datetime.now().isoformat()
            }
        }), 200

    except Exception as e:
        logging.error(f"Error in enrichment analysis: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/top_variable_genes', methods=['GET'])
def get_top_variable_genes():
    try:
        log_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        top_n = int(request.args.get('top_n', 100))

        variances = log_data.var(axis=1)
        top_variable = variances.nlargest(top_n)

        result = {
            'genes': top_variable.index.tolist(),
            'variances': top_variable.values.tolist(),
            'metadata': {
                'total_genes': len(log_data.index),
                'selected_genes': len(top_variable),
                'variance_range': {
                    'min': float(top_variable.min()),
                    'max': float(top_variable.max())
                }
            }
        }

        return jsonify(result)

    except Exception as e:
        logging.error(f"Error getting top variable genes: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# Add utility function to validate genes
def validate_genes(genes):
    """Validate gene symbols against known databases"""
    try:
        # Check against HGNC database or similar
        valid_genes = []
        for gene in genes:
            response = requests.get(
                f"https://rest.genenames.org/fetch/symbol/{gene}",
                headers={"Accept": "application/json"}
            )
            if response.ok:
                valid_genes.append(gene)
        return valid_genes
    except Exception as e:
        app.logger.error(f"Gene validation error: {str(e)}")
        return []


    
@app.route('/api/genomic-tools/redirect', methods=['GET'])
def get_tool_url():
    """Get redirect URL for genomic tools"""
    try:
        tool = request.args.get('tool')
        
        if tool not in GENOMIC_TOOL_URLS:
            return jsonify({
                "error": "Invalid tool specified",
                "available_tools": list(GENOMIC_TOOL_URLS.keys())
            }), 400
            
        return jsonify({
            "success": True,
            "tool": tool,
            "url": GENOMIC_TOOL_URLS[tool],
            "message": f"Redirect URL for {tool}"
        })
        
    except Exception as e:
        app.logger.error(f"Error getting tool URL: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/genomic-tools/info', methods=['GET'])
def get_tools_info():
    """Get information about available genomic tools"""
    tool_info = {
        'string': {
            'name': 'STRING',
            'description': 'Protein-Protein Interaction Networks',
            'url': GENOMIC_TOOL_URLS['string'],
            'features': ['Protein interactions', 'Network analysis', 'Functional enrichment']
        },
        'david': {
            'name': 'DAVID',
            'description': 'Functional Annotation Tool',
            'url': GENOMIC_TOOL_URLS['david'],
            'features': ['Gene ontology', 'Pathway analysis', 'Functional classification']
        },
        'gsea': {
            'name': 'GSEA',
            'description': 'Gene Set Enrichment Analysis',
            'url': GENOMIC_TOOL_URLS['gsea'],
            'features': ['Enrichment analysis', 'Pathway analysis', 'Gene set analysis']
        },
        'genemania': {
            'name': 'GeneMANIA',
            'description': 'Gene Function Prediction',
            'url': GENOMIC_TOOL_URLS['genemania'],
            'features': ['Gene network', 'Function prediction', 'Pathway analysis']
        }
    }
    
    return jsonify({
        "success": True,
        "tools": tool_info
    })



if __name__ == '__main__':
    logging.info(f"Starting server with data directory: {DATA_DIR}")
    
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        logging.info(f"Created data directory: {DATA_DIR}")
    
    app.run(debug=True)