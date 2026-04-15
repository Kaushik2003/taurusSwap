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

  // Pattern 1: Match code blocks WITH className
  const codeBlockPattern1 = /(<pre><code className="[^"]*">)(?!\{\`)([^]*?)(<\/code><\/pre>)/g;
  
  // Pattern 2: Match code blocks WITHOUT className
  const codeBlockPattern2 = /(<pre><code>)(?!\{\`)([^]*?)(<\/code><\/pre>)/g;

  function processCodeBlock(match, opening, codeContent, closing) {
    // Skip if already wrapped in template literal
    if (codeContent.trim().startsWith('{`')) {
      return match;
    }

    // Unescape HTML entities back to normal characters
    let unescaped = codeContent
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    // Escape template literal syntax inside the code
    // Replace ${...} with \${...} to prevent JSX from interpreting it
    unescaped = unescaped.replace(/\$\{/g, '\\${');
    
    // Escape backticks inside the code
    unescaped = unescaped.replace(/`/g, '\\`');

    // Wrap in template literal
    modified = true;
    return `${opening}{\`${unescaped}\`}${closing}`;
  }

  content = content.replace(codeBlockPattern1, processCodeBlock);
  content = content.replace(codeBlockPattern2, processCodeBlock);

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done!');
