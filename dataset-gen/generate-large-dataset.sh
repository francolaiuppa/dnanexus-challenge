#!/bin/bash

# Step 1: Generate the smaller dataset (10M lines)
echo "Generating mini-dataset (10M lines)..."
node dataset-generator.js

# Step 2: Concatenate the mini-dataset to create a larger dataset (100M lines)
echo "Concatenating mini-dataset to create dataset (100M lines)..."
for i in {1..10}; do
  cat mini-dataset.txt >> dataset.txt
done

# Step 3: Clean up the smaller dataset
echo "Removing mini-dataset..."
rm mini-dataset.txt

# Step 4: Move it to root
echo "Moving large dataset to root"
mv dataset.txt ../

# Completion message
echo "Dataset generation complete! File: dataset.txt (100M lines)"
