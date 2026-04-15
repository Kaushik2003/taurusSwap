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

  // Pattern to match code blocks that are already wrapped in {` `}
  // We need to escape template literals inside them
  const codeBlockPattern = /(<(?:pre|code)[^>]*>)\{\`([^]*?)\`\}(<\/(?:code|pre)>)/g;

  content = content.replace(codeBlockPattern, (match, opening, codeContent, closing) => {
    // Check if there are unescaped template literals
    if (codeContent.includes('${') && !codeContent.includes('\\${')) {
      // Escape template literals
      const escaped = codeContent.replace(/\$\{/g, '\\${');
      modified = true;
      return `${opening}{\`${escaped}\`}${closing}`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done!');
