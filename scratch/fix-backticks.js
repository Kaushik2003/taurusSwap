const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.tsx')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Find all .tsx files in app/docs
const files = getAllFiles('app/docs');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Pattern to match code blocks with className
  const pattern1 = /(<code className="[^"]*">)\{\`([^]*?)\`\}(<\/code>)/g;
  // Pattern to match code blocks without className
  const pattern2 = /(<code>)\{\`([^]*?)\`\}(<\/code>)/g;

  function replaceCodeBlock(match, opening, codeContent, closing) {
    // Escape backticks in the code content
    const escaped = codeContent.replace(/`/g, '\\`');
    modified = true;
    return `${opening}{\`${escaped}\`}${closing}`;
  }

  content = content.replace(pattern1, replaceCodeBlock);
  content = content.replace(pattern2, replaceCodeBlock);

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done!');
