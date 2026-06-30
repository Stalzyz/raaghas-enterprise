const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.turbo')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [
  ...walk(path.join(__dirname, 'apps', 'storefront')),
  ...walk(path.join(__dirname, 'apps', 'admin')),
  ...walk(path.join(__dirname, 'apps', 'api'))
];

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Pattern 1: process.env.NEXT_PUBLIC_API_URL || 'https://api.raaghas.in...'
  // Pattern 2: process.env.NEXT_PUBLIC_API_URL || "https://api.raaghas.in..."
  // Pattern 3: process.env.API_URL || "https://api.raaghas.in..."
  const regex = /(process\.env\.(?:NEXT_PUBLIC_)?API_URL\s*\|\|\s*)(['"])https:\/\/api\.raaghas\.in([^'"]*)(['"])/g;

  content = content.replace(regex, (match, prefix, quote1, suffix, quote2) => {
    // Only replace if it doesn't already have the development fallback logic next to it
    // But since our regex specifically looks for exactly the string literal after ||, we are safe.
    return `${prefix}(process.env.NODE_ENV === 'development' ? ${quote1}http://localhost:6005${suffix}${quote2} : ${quote1}https://api.raaghas.in${suffix}${quote2})`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`\nSuccessfully updated ${changedFiles} files.`);
