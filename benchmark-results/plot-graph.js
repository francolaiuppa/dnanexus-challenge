import QuickChart from 'quickchart-js';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the current directory of the script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read benchmark data from CSV
function readBenchmarkData(filePath) {
  const absolutePath = path.join(__dirname, filePath);
  const csv = readFileSync(absolutePath, 'utf8');
  const lines = csv.trim().split('\n').slice(1); // Skip the header
  const runs = [];
  const meanTimes = [];
  const stdDevs = [];

  lines.forEach((line) => {
    const [run, , mean, stddev] = line.split(',');
    runs.push(`Run ${run}`);
    meanTimes.push(parseFloat(mean));
    stdDevs.push(parseFloat(stddev));
  });

  return { runs, meanTimes, stdDevs };
}

// Generate a line chart using QuickChart
async function generateChart(data) {
  const chart = new QuickChart();
  chart.setWidth(800);
  chart.setHeight(600);
  chart.setConfig({
    type: 'line',
    data: {
      labels: data.runs, // X-axis: Run numbers
      datasets: [
        {
          label: 'Mean Time (ms)',
          data: data.meanTimes,
          borderColor: 'blue',
          fill: false,
        },
        {
          label: 'Std Dev (ms)',
          data: data.stdDevs,
          borderColor: 'orange',
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Benchmark Results: Line Lookup Performance',
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Run' },
        },
        y: {
          title: { display: true, text: 'Time (ms)' },
        },
      },
    },
  });

  const imageBuffer = await chart.toBinary();
  const graphPath = path.join(__dirname, 'graph.png');
  writeFileSync(graphPath, imageBuffer);
  console.log('Graph saved as graph.png');
}

// Main
const data = readBenchmarkData('data.csv'); // Adjust path if needed
generateChart(data);
