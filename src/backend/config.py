import os
import logging
from logging.config import dictConfig

# Base directory configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
SCRIPT_DIR = os.path.join(BASE_DIR, 'scripts')

# Create directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SCRIPT_DIR, exist_ok=True)

# File paths
REQUIRED_FILES = {
    'raw_counts.csv': 'Raw gene expression counts',
    'log_transformed_data.csv': 'Log-transformed expression data',
    'experiment_design.csv': 'Experimental design information',
    'deseq2_results.json': 'DESeq2 analysis results'
}

# Enrichr API configuration
ENRICHR_ADD_LIST_URL = 'https://maayanlab.cloud/Enrichr/addList'
ENRICHR_ENRICH_URL = 'https://maayanlab.cloud/Enrichr/enrich'
MAX_RETRIES = 3
DELAY_BETWEEN_RETRIES = 5

# Analysis parameters
DEFAULT_TOP_N_GENES = 500
PVALUE_THRESHOLD = 0.05
LOG2FC_THRESHOLD = 1

# Genomic Tools Configuration
GENOMIC_TOOLS = {
    "string": {
        "base_url": "https://string-db.org/api",
        "api_version": "11.5",
        "species": 9606,  # Human
        "required_score": 400,
        "network_type": "functional",
        "cache_timeout": 3600  # 1 hour
    },
    "david": {
        "base_url": "https://david.ncifcrf.gov/api.jsp",
        "categories": ["GOTERM_BP_DIRECT", "KEGG_PATHWAY"],
        "cache_timeout": 3600
    },
    "gsea": {
        "base_url": "http://www.gsea-msigdb.org/gsea/msigdb",
        "collections": ["h", "c2.cp.kegg", "c5.bp"],
        "cache_timeout": 3600
    },
    "genemania": {
        "base_url": "https://genemania.org/api",
        "organism": "homo-sapiens",
        "cache_timeout": 3600
    }
}

# Tool-specific paths
TOOL_PATHS = {
    'string_results': os.path.join(DATA_DIR, 'string_results'),
    'david_results': os.path.join(DATA_DIR, 'david_results'),
    'gsea_results': os.path.join(DATA_DIR, 'gsea_results'),
    'genemania_results': os.path.join(DATA_DIR, 'genemania_results'),
}

# Create tool result directories
for path in TOOL_PATHS.values():
    os.makedirs(path, exist_ok=True)

# Logging configuration
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'default': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'default',
            'level': logging.DEBUG
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'app.log'),
            'formatter': 'default',
            'level': logging.INFO
        }
    },
    'root': {
        'level': logging.DEBUG,
        'handlers': ['console', 'file']
    }
}

# Initialize logging
dictConfig(LOGGING_CONFIG)