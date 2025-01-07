import { createWriteStream } from 'node:fs';
import { join } from 'path';

function generateRandomLine(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function updateConsoleProgress(current, total) {
  const percentage = ((current / total) * 100).toFixed(2);
  process.stdout.write(`\rGenerating lines: ${current}/${total} (${percentage}%)`);
}

function generateDataset(filePath, numLines) {
  const writeStream = createWriteStream(filePath);
  const updateInterval = Math.max(1, Math.floor(numLines / 100)); // Update every 1% or at least every line

  const batchSize = 1000;
  let batch = '';
  for (let i = 0; i < numLines; i++) {
    const randomLength = Math.floor(Math.random() * 1000) + 1; // lines can be 1 to 1000 bytes long
    batch += `${generateRandomLine(randomLength)}\n`;

    if (i % batchSize === 0) {
      writeStream.write(batch);
      batch = ''; // clear batch after writing
    }

    if (i % updateInterval === 0 || i === numLines - 1) {
      updateConsoleProgress(i + 1, numLines);
    }
  }

  writeStream.end(() => {
    console.log(`Generated file with ${numLines} lines at ${filePath}`);
  });
}

// Adjust number of lines and file path as needed
generateDataset(join(process.cwd(), 'mini-dataset.txt'), 1_000_000);