const fs = require('fs');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

replaceInFile('components/hr/onboarding/employee-details-modal.tsx', [
  [/bg-\[\#0a0a0a\]/g, 'bg-background'],
  [/bg-\[\#111111\]/g, 'bg-card'],
  [/bg-\[\#1a1a1a\]/g, 'bg-secondary'],
  [/bg-\[\#131b26\]/g, 'bg-card'],
  [/bg-\[\#1b1326\]/g, 'bg-card'],
  [/bg-\[\#13261a\]/g, 'bg-card'],
  [/bg-\[\#261d13\]/g, 'bg-card'],
  [/border-blue-900\/30/g, 'border-border'],
  [/border-purple-900\/30/g, 'border-border'],
  [/border-emerald-900\/30/g, 'border-border'],
  [/border-amber-900\/30/g, 'border-border']
]);

replaceInFile('components/hr/onboarding/onboarding-table.tsx', [
  [/bg-\[\#111111\]/g, 'bg-card'],
  [/bg-\[\#1a1a1a\]/g, 'bg-secondary'],
  [/hover:bg-\[\#252525\]/g, 'hover:bg-accent']
]);

console.log('Hex replacements done.');
