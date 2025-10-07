const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('./Data/india-border.json', 'utf8'));

// Get unique shape names and types
const shapeNames = new Set();
const shapeTypes = new Set();

data.features.slice(0, 100).forEach(feature => {
  shapeNames.add(feature.properties.shapeName);
  shapeTypes.add(feature.properties.shapeType);
});

console.log('First 100 shape names:', Array.from(shapeNames));
console.log('Shape types:', Array.from(shapeTypes));