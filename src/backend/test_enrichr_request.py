from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import pdist
from scipy import stats
from sklearn.cluster import KMeans
from flask_caching import Cache
import json
import logging
import time
import os
import gseapy as gp
import pandas as pd
import numpy as np
import requests
import json
import logging
from typing import List, Dict, Any
from requests.exceptions import HTTPError

# Enhanced logging setup
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Get absolute path to data directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, 'data')

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

def get_data_path(filename):
    """Helper function to get the correct data file path"""
    path = os.path.join(DATA_DIR, filename)
    logging.debug(f"Accessing file: {path}")
    return path

def filter_top_variable_genes(expression_data, top_n=500):
    # Calculate variance for each gene (row-wise variance)
    variances = expression_data.var(axis=1)
    # Select the top N genes based on variance
    top_genes = variances.nlargest(top_n).index
    return expression_data.loc[top_genes]

def extract_significant_genes():
    try:
        deseq2_file = get_data_path("deseq2_results.json")
        if not os.path.exists(deseq2_file):
            raise FileNotFoundError("DESeq2 results file not found")

        with open(deseq2_file, 'r') as f:
            deseq2_results = json.load(f)

        # Extract significant genes into a list of strings
        significant_genes = [
            str(gene['gene']) for gene in deseq2_results
            if gene.get('adjusted_p_value') < 0.05 and abs(gene.get('log2_fold_change', 0)) > 1
        ]
        return significant_genes

    except Exception as e:
        logging.error(f"Error extracting significant genes: {str(e)}", exc_info=True)
        return []
    

MAX_RETRIES = 3
DELAY_BETWEEN_RETRIES = 5  # seconds


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

@app.route('/api/top_expressed', methods=['GET'])
def get_top_expressed():
    try:
        log_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        top_n = int(request.args.get('top_n', 10))
        
        # Calculate the mean expression for each gene across all samples
        gene_means = log_data.mean(axis=1)
        top_genes = gene_means.nlargest(top_n)
        
        # Prepare the result with gene names and their mean expression values
        result = {
            'top_genes': top_genes.index.tolist(),
            'mean_expression': top_genes.values.tolist()
        }
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error in get_top_expressed: {str(e)}", exc_info=True)
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

@app.route('/api/clustering', methods=['GET'])
def get_clustering():
    try:
        # Step 1: Load expression data
        log_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        logging.info(f"Loaded expression data shape: {log_data.shape}")

        # Step 2: Filter top variable genes (e.g., top 500 most variable)
        top_n_genes = int(request.args.get('top_n_genes', 500))
        filtered_data = filter_top_variable_genes(log_data, top_n=top_n_genes)
        logging.info(f"Filtered data shape: {filtered_data.shape}")

        # Step 3: Normalize with Z-scores
        zscore_data = pd.DataFrame(
            stats.zscore(filtered_data, axis=1),
            index=filtered_data.index,
            columns=filtered_data.columns
        )

        # Step 4: Perform hierarchical clustering
        gene_distances = pdist(zscore_data.values, metric='correlation')
        sample_distances = pdist(zscore_data.values.T, metric='correlation')

        gene_linkage = linkage(gene_distances, method='average')
        sample_linkage = linkage(sample_distances, method='average')

        # Reorder data based on clustering
        gene_dendrogram = dendrogram(gene_linkage, no_plot=True)
        sample_dendrogram = dendrogram(sample_linkage, no_plot=True)

        reordered_data = zscore_data.iloc[
            gene_dendrogram['leaves'],
            sample_dendrogram['leaves']
        ]

        # Create the result object with all necessary information
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
        
        # Validate design file format
        if not all(col in design_data.columns for col in ['sample', 'condition']):
            return jsonify({"error": "Invalid design file format"}), 400
            
        # Get summary statistics
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

@app.route('/api/upload_design', methods=['POST'])
def upload_design():
    try:
        if 'design_file' not in request.files:
            return jsonify({"error": "No design file provided."}), 400
        
        design_file = request.files['design_file']
        
        if design_file.filename == '':
            return jsonify({"error": "No selected file."}), 400
        
        if not design_file.filename.endswith('.csv'):
            return jsonify({"error": "Invalid file type. Please upload a CSV file."}), 400

        # Read the file to validate its contents
        df = pd.read_csv(design_file)
        
        # Check required columns
        if not all(col in df.columns for col in ['sample', 'condition']):
            return jsonify({"error": "Invalid file format. File must contain 'sample' and 'condition' columns."}), 400
            
        # Check for duplicate samples
        if df['sample'].duplicated().any():
            return jsonify({"error": "Duplicate sample names found in design file."}), 400
        
        # Validate samples exist in expression data
        expression_data = pd.read_csv(get_data_path("log_transformed_data.csv"), index_col=0)
        missing_samples = set(df['sample']) - set(expression_data.columns)
        if missing_samples:
            return jsonify({
                "error": f"Some samples in design file not found in expression data: {', '.join(missing_samples)}"
            }), 400

        # Save the validated file
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
    

# Update Enrichr API endpoints
ENRICHR_ADD_LIST_URL = 'https://maayanlab.cloud/Enrichr/addList'
ENRICHR_ENRICH_URL = 'https://maayanlab.cloud/Enrichr/enrich'

def submit_to_enrichr(payload):
    retries = 0
    while retries < MAX_RETRIES:
        try:
            response = requests.post(ENRICHR_ADD_LIST_URL, files=payload, timeout=10)
            response.raise_for_status()
            return response.json()  # Keep this as the parsed JSON
        except HTTPError as e:
            if response.status_code == 429:  # Too Many Requests
                retries += 1
                time.sleep(DELAY_BETWEEN_RETRIES)
                continue
            raise e  # Re-raise the exception if it's not a 429 error
    raise Exception("Max retries exceeded for Enrichr submission.")

@app.route('/api/enrichr_full_analysis', methods=['POST'])
def run_enrichr_analysis():
    try:
        significant_genes = extract_significant_genes()
        logging.info(f"Significant genes to submit: {significant_genes}")

        if not significant_genes:
            raise ValueError("No significant genes found or error extracting genes")

        description = 'Significant genes for enrichment analysis'
        genes_str = '\n'.join(significant_genes)
        payload = {
            'list': (None, genes_str),
            'description': (None, description)
        }

        logging.info("Submitting gene list to Enrichr")
        enrichr_data = submit_to_enrichr(payload)

        user_list_id = enrichr_data.get('userListId')
        if not user_list_id:
            raise Exception("Failed to get userListId from Enrichr")

        logging.info(f"Enrichr userListId: {user_list_id}")

        # Fetch Enrichment Results
        library = request.json.get('library', 'KEGG_2015')
        query_string = f"?userListId={user_list_id}&backgroundType={library}"
        logging.info(f"Fetching enrichment results for userListId {user_list_id} with library {library}")
        
        results_response = requests.get(ENRICHR_ENRICH_URL + query_string, timeout=10)
        results_response.raise_for_status()

        enrichment_results = results_response.json()
        logging.info(f"Enrichment results received: {enrichment_results}")

        # Adding total and significant genes to the response
        response_data = {
            "enrichment_results": enrichment_results,
            "total_genes": len(extract_significant_genes()),
            "significant_genes": len(significant_genes)
        }

        print('test',json.dumps(response_data))

        return jsonify(response_data), 200


    except Exception as e:
        logging.error(f"Error running Enrichr analysis: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    logging.info(f"Starting server with data directory: {DATA_DIR}")
    
    if not os.path.exists(DATA_DIR):
        logging.error(f"Data directory not found: {DATA_DIR}")
        sys.exit(1)
    
    required_files = ['log_transformed_data.csv']
    missing_files = [f for f in required_files if not os.path.exists(get_data_path(f))]
    
    if missing_files:
        logging.error(f"Missing required files: {missing_files}")
        sys.exit(1)
        
    logging.info(f"Found data files: {os.listdir(DATA_DIR)}")
    app.run(debug=True)
