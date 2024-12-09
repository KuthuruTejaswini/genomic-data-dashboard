#!/usr/bin/env Rscript

# deseq2_analysis.R

# Function to log messages
log_message <- function(message) {
  cat(sprintf("[%s] %s\n", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), message))
}

# Error handling function
handle_error <- function(e) {
  log_message(sprintf("ERROR: %s", e$message))
  if (!is.null(e$call)) {
    log_message(sprintf("Error occurred in: %s", deparse(e$call)))
  }
  quit(status = 1)
}

# Load required libraries
log_message("Loading required libraries...")
tryCatch({
  suppressPackageStartupMessages({
    library(DESeq2)
    library(jsonlite)
  })
  log_message("Libraries loaded successfully")
}, error = handle_error)

# Function to check if a package is installed
is_package_installed <- function(package_name) {
  return(package_name %in% rownames(installed.packages()))
}

# Check and install required packages
required_packages <- c("DESeq2", "jsonlite")
for (package in required_packages) {
  if (!is_package_installed(package)) {
    log_message(sprintf("Package '%s' is not installed. Please install it using BiocManager::install('%s')", package, package))
    quit(status = 1)
  }
}

# Read command line arguments
args <- commandArgs(trailingOnly = TRUE)

if (length(args) != 3) {
  log_message("Usage: Rscript deseq2_analysis.R <input_file> <output_file> <design_file>")
  quit(status = 1)
}

input_file <- args[1]
output_file <- args[2]
design_file <- args[3]

log_message(sprintf("Input file: %s", input_file))
log_message(sprintf("Output file: %s", output_file))
log_message(sprintf("Design file: %s", design_file))

# Check if input files exist
if (!file.exists(input_file)) {
  log_message(sprintf("Error: Input file '%s' does not exist.", input_file))
  quit(status = 1)
}
if (!file.exists(design_file)) {
  log_message(sprintf("Error: Design file '%s' does not exist.", design_file))
  quit(status = 1)
}

# Try to read the data
log_message("Reading input files...")
tryCatch({
  count_data <- read.csv(input_file, row.names = 1)
  design <- read.csv(design_file)
  log_message("Files read successfully")
}, error = handle_error)

# Check if the data is empty
if (nrow(count_data) == 0 || ncol(count_data) == 0) {
  log_message("Error: The input count data is empty.")
  quit(status = 1)
}
if (nrow(design) == 0 || ncol(design) == 0) {
  log_message("Error: The design data is empty.")
  quit(status = 1)
}

# Create DESeqDataSet object
log_message("Creating DESeqDataSet object...")
tryCatch({
  dds <- DESeqDataSetFromMatrix(countData = count_data,
                                colData = design,
                                design = ~ condition)
  log_message("DESeqDataSet object created successfully")
}, error = handle_error)

# Run DESeq2 analysis
log_message("Running DESeq2 analysis...")
tryCatch({
  dds <- DESeq(dds)
  log_message("DESeq2 analysis completed successfully")
}, error = handle_error)

# Get results
log_message("Retrieving results...")
res <- results(dds)

# Convert results to a data frame
res_df <- as.data.frame(res)
res_df$gene <- rownames(res_df)

# Select relevant columns and rename
final_results <- res_df[, c("gene", "baseMean", "log2FoldChange", "pvalue", "padj")]
colnames(final_results) <- c("gene", "baseMean", "log2_fold_change", "p_value", "adjusted_p_value")

# Write results to JSON file
log_message("Writing results to JSON file...")
tryCatch({
  write_json(final_results, output_file)
  log_message(sprintf("Results written to %s", output_file))
}, error = handle_error)

log_message("Analysis completed successfully")
