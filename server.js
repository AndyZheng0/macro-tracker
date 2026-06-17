const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function getInitialState() {
  return {
    goals: { cals: 2000, protein: 150, carbs: 200, fat: 65 },
    meals: [],
  };
}

function readData() {
  try {
    if (!fs.existsSync(dataFile)) {
      return getInitialState();
    }
    const raw = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data file:', err);
    return getInitialState();
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

app.get('/api/data', (req, res) => {
  res.json(readData());
});

app.put('/api/state', (req, res) => {
  const state = req.body;
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'Invalid state payload' });
  }
  writeData(state);
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Macro tracker server running at http://localhost:${port}`);
});
