// read the file
import { writeFile, createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'readline';

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
      let lines = leftover.split('\n');
      leftover = lines.pop();

      lines.forEach((line) => {
        offsets.push(offset);
        offset += Buffer.byteLength(line + '\n', 'utf8');
      });
    });

    readStream.on('end', () => {
      if (leftover) {
        offsets.push(offset);
      }

      writeFile(indexFile, offsets.join('\n'), (err) => {
        if (err) reject(err);
        resolve();
      });
    });

    readStream.on('error', reject);
  });
}

async function requestLineFromDatasetUsingOffsets(datasetFile, start, end) {
  return new Promise((resolve, reject) => {
    const readStream = createReadStream(datasetFile, {
      encoding: 'utf-8',
      start,
      end
    });
    let result = '';
    readStream.on('data', (chunk) => { result += chunk; });
    readStream.on('end', () => resolve(result));
    readStream.on('error', reject);
  });
}

// @TODO: improve this function to use binary offsets to
// avoid depending on readline
async function findOffsets(indexFile, lineNumber) {
  return new Promise((resolve, reject) => {
    if (typeof lineNumber !== 'number') {
      return reject(new Error('ERROR: The requested line number is not a number'));
    }
    const readStream = createReadStream(indexFile);
    const rl = createInterface({ input: readStream });
    let currentLine = 0;
    let startOffset = null;
    let endOffset = null;

    rl.on('line', (line) => {
      currentLine++;
      if (currentLine === lineNumber) {
        startOffset = Number(line);
      }
      if (currentLine === lineNumber + 1) {
        endOffset = Number(line)-2; // prevent returning the 1st character of new line + newline char
        rl.close(); // prevent continuing if we already found what we need
      }
    });

    rl.on('close', () => {
      if (startOffset !== null) {
        resolve({ startOffset, endOffset });
      } else {
        reject(new Error(`Line number ${lineNumber} not found in index.`));
      }
    });

    rl.on('error', reject);
  });
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