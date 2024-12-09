from pathlib import Path
import pandas as pd
import numpy as np
import logging
import subprocess
import os
import json
from typing import Tuple, Optional, Dict, Any
from config import DATA_DIR, DEFAULT_TOP_N_GENES
from utils import get_data_path, safe_save_csv, validate_dataframe

class DataProcessor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # Add data_dir initialization
        self.data_dir = Path(__file__).parent.parent.parent / "data"
        self.r_script_path = Path(__file__).parent / "deseq2_analysis.R"
        
        # Create data directory if it doesn't exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger.info(f"Initialized with data directory: {self.data_dir}")
        self.logger.info(f"R script path: {self.r_script_path}")
        
        # Check R installation and packages
        try:
            # Check R is installed
            r_version = subprocess.run(["Rscript", "--version"], 
                                     capture_output=True, 
                                     text=True)
            self.logger.info(f"R version: {r_version.stderr}")
            
            # Check required packages
            if not self.check_r_packages():
                self.logger.warning("Some required R packages are missing. DESeq2 analysis may fail.")
        except Exception as e:
            self.logger.warning(f"Error checking R setup: {str(e)}")

    def check_r_packages(self) -> bool:
        """Check if required R packages are installed"""
        try:
            check_packages_cmd = [
                "Rscript",
                "-e",
                'if (!all(c("DESeq2", "jsonlite") %in% installed.packages()[,"Package"])) quit(status=1)'
            ]
            result = subprocess.run(check_packages_cmd, capture_output=True, text=True)
            return result.returncode == 0
        except Exception as e:
            self.logger.error(f"Error checking R packages: {str(e)}")
            return False

    def validate_raw_counts(self, df: pd.DataFrame) -> Tuple[bool, str]:
        """Validate the raw counts data format and content"""
        try:
            # Check if file is empty
            if df.empty:
                return False, "File is empty"
                
            # Check if index column exists and is unique
            if df.index.duplicated().any():
                return False, "Duplicate gene names found in the index"
                
            # Check for numeric values
            if not df.select_dtypes(include=[np.number]).columns.size == df.columns.size:
                return False, "All count values must be numeric"
                
            # Check for negative values
            if (df < 0).any().any():
                return False, "Raw counts cannot contain negative values"
                
            # Check for zero variance genes
            zero_var_genes = df.index[df.var(axis=1) == 0]
            if not zero_var_genes.empty:
                self.logger.warning(f"Found {len(zero_var_genes)} genes with zero variance")
                
            return True, ""
        except Exception as e:
            return False, f"Validation error: {str(e)}"
    def validate_design_file(self, design_data: pd.DataFrame) -> Tuple[bool, str]:
        """Validate design file format"""
        try:
            # Check required columns
            if not all(col in design_data.columns for col in ['sample', 'condition']):
                return False, "Design file must contain 'sample' and 'condition' columns"
                
            # Check for duplicates
            if design_data['sample'].duplicated().any():
                return False, "Duplicate sample names found in design file"
                
            # Check condition values
            if len(design_data['condition'].unique()) < 2:
                return False, "At least two different conditions required"
                
            return True, ""
        except Exception as e:
            return False, str(e)

    def preprocess_data(self, data: pd.DataFrame) -> Tuple[Optional[pd.DataFrame], Optional[pd.DataFrame]]:
        """Preprocess raw counts data"""
        try:
            # Remove genes with zero counts across all samples
            data_filtered = data[(data > 0).any(axis=1)]
            self.logger.info(f"Filtered data shape: {data_filtered.shape}")
            
            # Log2 transform for visualization
            data_log = np.log2(data_filtered + 1)
            
            return data_filtered, data_log
        except Exception as e:
            self.logger.error(f"Error preprocessing data: {str(e)}")
            return None, None

    def calculate_summary_stats(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Calculate summary statistics for the data"""
        try:
            summary = {
                'samples': len(data.columns),
                'genes': len(data.index),
                'mean_counts': float(data.mean().mean()),
                'median_counts': float(data.median().median()),
                'zero_counts_pct': float((data == 0).sum().sum() / (data.shape[0] * data.shape[1]) * 100),
                'non_zero_genes': int((data > 0).any(axis=1).sum()),
                'stats_per_sample': {
                    'mean': data.mean().to_dict(),
                    'median': data.median().to_dict(),
                    'std': data.std().to_dict()
                }
            }
            return summary
        except Exception as e:
            self.logger.error(f"Error calculating summary stats: {str(e)}")
            return {}

    def filter_top_variable_genes(self, data: pd.DataFrame, top_n: int = DEFAULT_TOP_N_GENES) -> pd.DataFrame:
        """Filter top variable genes"""
        try:
            variances = data.var(axis=1)
            top_genes = variances.nlargest(top_n).index
            return data.loc[top_genes]
        except Exception as e:
            self.logger.error(f"Error filtering top variable genes: {str(e)}")
            return data
    def get_top_expressed_genes(
        self,
        top_n: int = DEFAULT_TOP_N_GENES
    ) -> Dict[str, Any]:
        """
        Get top expressed genes from existing DESeq2 results
        
        Args:
            top_n: Number of top genes to return
        Returns:
            Dictionary containing top genes and metadata
        """
        try:
            # Load existing DESeq2 results
            deseq2_results_path = self.data_dir / "deseq2_results.json"
            
            if not deseq2_results_path.exists():
                raise FileNotFoundError("DESeq2 results file not found. Please run DESeq2 analysis first.")
                
            # Read the results
            with open(deseq2_results_path, 'r') as f:
                deseq_data = json.load(f)
                
            # Convert to DataFrame
            results_df = pd.DataFrame(deseq_data)
            
            # Verify required columns exist
            required_columns = ['gene', 'log2_fold_change', 'p_value', 'adjusted_p_value']
            if not all(col in results_df.columns for col in required_columns):
                raise ValueError(f"Missing required columns in DESeq2 results. Required: {required_columns}")
            
            # Filter for significant genes (p-adj < 0.05)
            significant_genes = results_df[
                (results_df['adjusted_p_value'].notna()) & 
                (results_df['adjusted_p_value'] < 0.05)
            ]
            
            # Sort by absolute log2 fold change
            significant_genes['abs_log2fc'] = abs(significant_genes['log2_fold_change'])
            top_genes = significant_genes.nlargest(min(top_n, len(significant_genes)), 'abs_log2fc')
            
            # Format results
            formatted_results = {
                'top_genes': [
                    {
                        'gene': row['gene'],
                        'log2_fold_change': float(row['log2_fold_change']),
                        'p_value': float(row['p_value']),
                        'adjusted_p_value': float(row['adjusted_p_value']),
                        'fold_change': float(2 ** abs(row['log2_fold_change'])),
                        'regulation': 'up' if row['log2_fold_change'] > 0 else 'down'
                    }
                    for _, row in top_genes.iterrows()
                ],
                'metadata': {
                    'total_genes': len(results_df),
                    'significant_genes': len(significant_genes),
                    'analysis_parameters': {
                        'significance_threshold': 0.05,
                        'top_n': top_n
                    },
                    'summary': {
                        'upregulated': len(significant_genes[significant_genes['log2_fold_change'] > 0]),
                        'downregulated': len(significant_genes[significant_genes['log2_fold_change'] < 0])
                    }
                }
            }
            
            return formatted_results
            
        except Exception as e:
            self.logger.error(f"Error getting top expressed genes: {str(e)}")
            raise
    def run_deseq2_analysis(self) -> bool:
        """Run DESeq2 analysis using existing count and design data"""
        try:
            # Check if input files exist
            count_file = self.data_dir / "raw_counts.csv"
            design_file = self.data_dir / "experiment_design.csv"
            output_file = self.data_dir / "deseq2_results.json"
            
            # Detailed file checks
            self.logger.info("Checking files:")
            self.logger.info(f"Count file exists: {count_file.exists()}")
            self.logger.info(f"Design file exists: {design_file.exists()}")
            self.logger.info(f"R script exists: {self.r_script_path.exists()}")
            
            if not count_file.exists():
                raise FileNotFoundError(f"Count data file not found at {count_file}")
            if not design_file.exists():
                raise FileNotFoundError(f"Design file not found at {design_file}")
                
            # Read and validate input files
            try:
                counts = pd.read_csv(count_file, index_col=0)
                design = pd.read_csv(design_file)
                
                # Validate files
                is_valid, error_msg = self.validate_raw_counts(counts)
                if not is_valid:
                    raise ValueError(f"Invalid count data: {error_msg}")
                    
                is_valid, error_msg = self.validate_design_file(design)
                if not is_valid:
                    raise ValueError(f"Invalid design file: {error_msg}")
                    
                self.logger.info(f"Count data shape: {counts.shape}")
                self.logger.info(f"Design data shape: {design.shape}")
                self.logger.info(f"Design columns: {design.columns.tolist()}")
                
            except Exception as e:
                raise ValueError(f"Error reading input files: {str(e)}")
            
            # Run R script
            cmd = [
                "Rscript",
                "--vanilla",
                str(self.r_script_path),
                str(count_file),
                str(design_file),
                str(output_file)
            ]
            
            self.logger.info(f"Running command: {' '.join(cmd)}")
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            
            stdout, stderr = process.communicate(timeout=300)
            
            if stdout:
                self.logger.info(f"DESeq2 output:\n{stdout}")
            if stderr:
                self.logger.error(f"DESeq2 errors:\n{stderr}")
                
            if process.returncode != 0:
                raise RuntimeError(f"DESeq2 analysis failed with return code {process.returncode}\nError: {stderr}")
                
            # Verify output
            if not output_file.exists():
                raise FileNotFoundError(f"DESeq2 did not create output file at {output_file}")
                
            with open(output_file, 'r') as f:
                results = json.load(f)
                self.logger.info(f"Successfully created results with {len(results)} entries")
                
            return True
                
        except Exception as e:
            self.logger.error(f"Error running DESeq2 analysis: {str(e)}")
            return False

    def process_upload(self, raw_counts_df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
        """Process uploaded raw counts data"""
        try:
            # Validate data
            is_valid, error_message = self.validate_raw_counts(raw_counts_df)
            if not is_valid:
                return False, error_message, {}

            # Process data
            raw_filtered, log_transformed = self.preprocess_data(raw_counts_df)
            if raw_filtered is None or log_transformed is None:
                return False, "Error processing data", {}

            # Calculate summary statistics
            summary_stats = self.calculate_summary_stats(raw_filtered)

            return True, "Data processed successfully", {
                'raw_filtered': raw_filtered,
                'log_transformed': log_transformed,
                'summary': summary_stats
            }
        except Exception as e:
            self.logger.error(f"Error in process_upload: {str(e)}")
            return False, str(e), {}