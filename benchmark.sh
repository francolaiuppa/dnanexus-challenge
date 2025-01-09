#!/bin/bash

# Variables
SCRIPT="node --noconcurrent_sweeping --noconcurrent_marking index.js"         # Script to benchmark
DATASET="dataset.txt"          # Dataset file
OUTPUT_CSV="benchmark-results/data.csv" # CSV file to store results
RUNS=100                      # Number of benchmark runs.
MAX_LINE=100000000             # Maximum line number (100M)

# Initialize CSV
echo "Run,Random Line,Mean Time (ms),Std Dev (ms)" > $OUTPUT_CSV

# Ensure hyperfine is installed
if ! command -v hyperfine &> /dev/null; then
  echo "Hyperfine is not installed. Install it with:"
  echo "  sudo apt install hyperfine   # On Ubuntu/Debian"
  echo "  brew install hyperfine       # On macOS"
  exit 1
fi

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. Install it with:"
  echo "  sudo apt install jq # On Ubuntu/Debian"
  echo "  brew install jq     # On macOS"
  exit 1
fi

# Run benchmark
for (( i=1; i<=RUNS; i++ ))
do
  RANDOM_LINE=$((RANDOM % MAX_LINE + 1)) # Random number between 1 and 100M

  # Run hyperfine and extract results
  HYPERFINE_OUTPUT=$(hyperfine --warmup 2 --runs 5 --export-json temp.json "$SCRIPT $DATASET $RANDOM_LINE" 2>/dev/null)

  # Extract relevant metrics from the JSON output
  MEAN_TIME=$(jq '.results[0].mean * 1000' temp.json) # Convert seconds to milliseconds
  STD_DEV=$(jq '.results[0].stddev * 1000' temp.json) # Convert seconds to milliseconds

  # Log to CSV
  echo "$i,$RANDOM_LINE,$MEAN_TIME,$STD_DEV" >> $OUTPUT_CSV
  echo "Run $i: Random Line $RANDOM_LINE, Mean Time ${MEAN_TIME}ms, Std Dev ${STD_DEV}ms"
done

# Cleanup
rm -f temp.json

echo "Benchmark complete! Results saved to $OUTPUT_CSV"

echo "Generating plot..."
# IMPORTANT: QuickChart has a limit of datapoints. If you don't need
# the chart then you can greatly increase the RUNS constant (a couple thousands at least)
node ./benchmark-results/plot-graph.js 
echo "Plot generated successfully"
echo "Done"

