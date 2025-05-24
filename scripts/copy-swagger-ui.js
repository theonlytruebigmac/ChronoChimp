const fs = require('fs');
const path = require('path');

const swaggerDistPath = path.join(__dirname, '../node_modules/swagger-ui-dist');
const publicPath = path.join(__dirname, '../public');

// List of files to copy
const filesToCopy = [
  'swagger-ui.css',
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
  'favicon-16x16.png',
  'favicon-32x32.png'
];

// Create directory if it doesn't exist
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}

// Copy files
filesToCopy.forEach(file => {
  const srcPath = path.join(swaggerDistPath, file);
  const destPath = path.join(publicPath, file);
  
  try {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to public directory`);
  } catch (err) {
    console.error(`Error copying ${file}:`, err);
  }
});
