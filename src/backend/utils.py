import os
import logging
import pandas as pd
import numpy as np
import requests
from typing import Dict, Any, Optional, Tuple, List
from flask import jsonify
from config import DATA_DIR, TOOL_PATHS, GENOMIC_TOOLS

logger = logging.getLogger(__name__)

def get_data_path(filename: str) -> str:
    """Get absolute path for data files"""
    path = os.path.join(DATA_DIR, filename)
    logger.debug(f"Accessing file: {path}")
    return path

def check_tool_with_retry(url: str, tool_name: str, max_retries: int = 3, timeout: int = 10) -> dict:
    """Check tool availability with retry logic"""
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/json',
        'Accept-Language': 'en-US,en;q=0.9'
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(
                url,
                headers=headers,
                timeout=timeout,
                verify=True  # SSL verification
            )
            
            return {
                "available": response.status_code == 200,
                "status_code": response.status_code,
                "error": None
            }
            
        except requests.exceptions.SSLError:
            # Try again without SSL verification if SSL fails
            try:
                response = requests.get(
                    url,
                    headers=headers,
                    timeout=timeout,
                    verify=False
                )
                return {
                    "available": response.status_code == 200,
                    "status_code": response.status_code,
                    "error": "SSL verification failed but connection succeeded"
                }
            except Exception as e:
                continue
                
        except requests.exceptions.Timeout:
            if attempt == max_retries - 1:
                return {
                    "available": False,
                    "status_code": 408,
                    "error": f"Timeout accessing {tool_name} after {max_retries} attempts"
                }
            continue
            
        except requests.exceptions.ConnectionError:
            if attempt == max_retries - 1:
                return {
                    "available": False,
                    "status_code": 503,
                    "error": f"Failed to connect to {tool_name} after {max_retries} attempts"
                }
            continue
            
        except Exception as e:
            return {
                "available": False,
                "status_code": 500,
                "error": str(e)
            }
            
    return {
        "available": False,
        "status_code": 500,
        "error": f"All {max_retries} attempts failed for {tool_name}"
    }

def validate_dataframe(df: pd.DataFrame) -> Tuple[bool, str]:
    """Basic validation for dataframes"""
    try:
        if df.empty:
            return False, "DataFrame is empty"
        if df.isnull().values.any():
            return False, "DataFrame contains missing values"
        return True, ""
    except Exception as e:
        return False, str(e)

def safe_read_csv(file_path: str, **kwargs) -> Optional[pd.DataFrame]:
    """Safely read CSV file"""
    try:
        return pd.read_csv(file_path, **kwargs)
    except Exception as e:
        logger.error(f"Error reading CSV file {file_path}: {e}")
        return None

def safe_save_csv(df: pd.DataFrame, file_path: str, **kwargs) -> bool:
    """Safely save DataFrame to CSV"""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        df.to_csv(file_path, **kwargs)
        return True
    except Exception as e:
        logger.error(f"Error saving CSV file {file_path}: {e}")
        return False

def create_response(success: bool, message: str, data: Dict = None, status_code: int = 200) -> tuple:
    """Create standardized API response"""
    response = {
        "success": success,
        "message": message
    }
    if data is not None:
        response["data"] = data
    return jsonify(response), status_code

def ensure_directory_exists(directory: str) -> None:
    """Create directory if it doesn't exist"""
    if not os.path.exists(directory):
        os.makedirs(directory)
        logger.info(f"Created directory: {directory}")

def submit_to_string(genes: List[str]) -> Dict[str, Any]:
    """Submit genes to STRING database"""
    try:
        config = GENOMIC_TOOLS["string"]
        response = requests.post(
            f"{config['base_url']}/network",
            json={
                "identifiers": "\n".join(genes),
                "species": config["species"],
                "required_score": config["required_score"],
                "network_type": config["network_type"]
            }
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"STRING submission error: {str(e)}")
        raise

def submit_to_david(genes: List[str]) -> Dict[str, Any]:
    """Submit genes to DAVID"""
    try:
        config = GENOMIC_TOOLS["david"]
        response = requests.post(
            config["base_url"],
            data={
                "list": "\n".join(genes),
                "type": "OFFICIAL_GENE_SYMBOL",
                "annot": ",".join(config["categories"])
            }
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"DAVID submission error: {str(e)}")
        raise

def submit_to_gsea(genes: List[str]) -> Dict[str, Any]:
    """Submit genes to GSEA"""
    try:
        config = GENOMIC_TOOLS["gsea"]
        response = requests.post(
            f"{config['base_url']}/annotate.jsp",
            data={
                "genes": "\n".join(genes),
                "collections": ",".join(config["collections"])
            }
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"GSEA submission error: {str(e)}")
        raise

def submit_to_genemania(genes: List[str]) -> Dict[str, Any]:
    """Submit genes to GeneMANIA"""
    try:
        config = GENOMIC_TOOLS["genemania"]
        response = requests.get(
            f"{config['base_url']}/data/search/{'+'.join(genes)}",
            params={"organism": config["organism"]}
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"GeneMANIA submission error: {str(e)}")
        raise

def save_tool_results(tool: str, genes: List[str], results: Dict[str, Any]) -> str:
    """Save tool results to file"""
    try:
        result_dir = TOOL_PATHS[f"{tool}_results"]
        filename = f"{'-'.join(genes[:5])}_{len(genes)}_genes.json"
        filepath = os.path.join(result_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2)
            
        return filepath
    except Exception as e:
        logger.error(f"Error saving {tool} results: {str(e)}")
        raise

def get_cached_results(tool: str, genes: List[str]) -> Optional[Dict[str, Any]]:
    """Get cached results for a tool and gene list"""
    try:
        result_dir = TOOL_PATHS[f"{tool}_results"]
        filename = f"{'-'.join(sorted(genes[:5]))}_{len(genes)}_genes.json"
        filepath = os.path.join(result_dir, filename)
        
        if os.path.exists(filepath):
            # Check if cache is still valid
            if os.path.getmtime(filepath) + GENOMIC_TOOLS[tool]['cache_timeout'] > time.time():
                with open(filepath, 'r') as f:
                    return json.load(f)
                    
        return None
    except Exception as e:
        logger.error(f"Error getting cached results for {tool}: {str(e)}")
        return None

def validate_genes(genes: List[str]) -> Tuple[List[str], List[str]]:
    """Validate gene symbols and return valid and invalid genes"""
    try:
        valid_genes = []
        invalid_genes = []
        
        for gene in genes:
            # Check against HGNC database
            response = requests.get(
                f"https://rest.genenames.org/fetch/symbol/{gene}",
                headers={"Accept": "application/json"}
            )
            
            if response.ok and response.json()['response']['numFound'] > 0:
                valid_genes.append(gene)
            else:
                invalid_genes.append(gene)
                
        return valid_genes, invalid_genes
    except Exception as e:
        logger.error(f"Error validating genes: {str(e)}")
        raise