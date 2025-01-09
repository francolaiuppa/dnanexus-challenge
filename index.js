import { promises as fs, createReadStream, existsSync } from 'node:fs';

// generates an index file for faster retrieval calls
function generateIndexFile(datasetFile) {
  const indexFile = `${datasetFile}.idx`;
  return new Promise((resolve, reject) => {
    if (!existsSync(datasetFile)) {
      return reject(new Error(`The requested dataset "${datasetFile}" was not found.`));
    }

    const offsets = [];
    let offset = 0;
    const readStream = createReadStream(datasetFile, {
      encoding: 'utf-8', // assume dataset is in utf-8
      highWaterMark: 256 * 1024 // default chunk is is 64kB which is too low for this
    });
    let leftover = '';

    readStream.on('data', (chunk) => {
      leftover += chunk;
      const lines = leftover.split('\n');
      leftover = lines.pop();

      lines.forEach((line) => {
        offsets.push(offset);
        offset += Buffer.byteLength(line + '\n', 'utf8');
      });
    });

    readStream.on('end', async () => {
      if (leftover) {
        offsets.push(offset);
      }
    
      try {
        const fd = await fs.open(indexFile, 'w');
        const buffer = Buffer.alloc(4); // Allocate a small buffer
        for (const value of offsets) {
          buffer.writeUInt32LE(value, 0);
          await fd.write(buffer); // Write each offset incrementally
        }
        await fd.close();
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    readStream.on('error', (err) => {
      readStream.destroy();
      reject(err);
    });
  });
}

async function requestLineFromDatasetUsingOffsets(datasetFile, start, end) {
  const fd = await fs.open(datasetFile, 'r'); // Open the dataset file
  const buffer = Buffer.alloc(end - start + 1); // Allocate exact range size
  try {
    const { bytesRead } = await fd.read(buffer, 0, buffer.length, start); // Read specific range
    return buffer.toString('utf-8', 0, bytesRead); // Convert buffer to string
  } finally {
    await fd.close(); // Ensure file descriptor is closed
  }
}

async function findOffsets(indexFile, lineNumber) {
  try {
    const fd = await fs.open(indexFile, 'r');
    const buffer = Buffer.alloc(8); // Read 8 bytes for start and end offsets
    const position = (lineNumber - 1) * 4; // Each offset is 4 bytes

    // Read the start offset
    const { bytesRead: startBytes } = await fd.read(buffer, 0, 4, position);
    if (startBytes === 0) {
      throw new Error(`Line number ${lineNumber} exceeds the number of lines in the dataset.`);
    }
    const startOffset = buffer.readUInt32LE(0);

    // Read the next offset for end position
    const { bytesRead: endBytes } = await fd.read(buffer, 0, 4, position + 4);
    const endOffset = endBytes > 0 ? buffer.readUInt32LE(0) - 1 : undefined; // Use undefined for EOF

    if (endOffset === undefined && lineNumber > 1) {
      throw new Error(`Line number ${lineNumber} exceeds the number of lines in the dataset.`);
    }

    await fd.close();
    return { startOffset, endOffset };
  } catch (err) {
    throw err;
  }
}


function logVerbose(message) {
  const isVerbose = process.argv.includes('--verbose');
  if (isVerbose) { console.log(message); }
}

async function main(datasetFile, lineNumber) {
  try {
    // generate the index if its missing
    const indexFile = `${datasetFile}.idx`;
    if (!existsSync(indexFile)) {
      logVerbose('Index file does not exist. Creating it. This could take some time...');
      await generateIndexFile(datasetFile);
      logVerbose('Successfully generated index file');
    }
    // use the IDX file to retrieve a specific line.
    // extract offsets (_where_ expressed in bytes representing the line start/end)
    const { startOffset, endOffset } = await findOffsets(indexFile, Number(lineNumber));
    const theLine = await requestLineFromDatasetUsingOffsets(datasetFile, startOffset, endOffset);
    // output to stdout as requested in the exercise
    console.log(theLine);
  } catch (e) {
    // nice error message in case you forgot to redo your index file
    if (e instanceof RangeError && e.code === 'ERR_OUT_OF_RANGE') {
      console.error('ERROR: An OUT_OF_RANGE error occured. Maybe your index file is not up to date compared to the dataset?');
      process.exit(1);
    }
    console.error('An error occurred while running the script. Aborting', e);
    process.exit(1);
  }
}

const datasetFile = process.argv[2];
const lineNumber = process.argv[3];

if (!datasetFile || !lineNumber) {
  console.error('Usage: node index.js <datasetFile> <lineNumber> [--verbose]');
  process.exit(1);
}

main(datasetFile, lineNumber);