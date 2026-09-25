const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

replaceInFile('components/hr/onboarding/onboard-wizard.tsx', [
  [/text-red-500/g, 'text-destructive'],
]);

replaceInFile('components/hr/onboarding/employee-details-modal.tsx', [
  [/bg-blue-500\/20 text-blue-500/g, 'bg-primary/20 text-primary'],
  [/text-blue-400\/80/g, 'text-muted-foreground'],
  [/text-blue-100/g, 'text-foreground'],
  [/text-blue-400\/60/g, 'text-muted-foreground'],
  [/bg-purple-500\/20 text-purple-500/g, 'bg-secondary/50 text-secondary-foreground'],
  [/text-purple-400\/80/g, 'text-muted-foreground'],
  [/text-purple-100/g, 'text-foreground'],
  [/text-purple-400\/60/g, 'text-muted-foreground'],
  [/className="text-blue-500"/g, 'className="text-primary"']
]);

replaceInFile('components/hr/onboarding/delete-employee-button.tsx', [
  [/text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900\/30 dark:hover:bg-red-950\/30 dark:hover:text-red-500/g, 'text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'],
  [/bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/g, 'bg-background border-border'],
  [/border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/g, 'border-border text-foreground hover:bg-accent']
]);

replaceInFile('components/hr/onboarding/checklist-item.tsx', [
  [/border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950\/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/g, 'border-border bg-card hover:bg-accent'],
  [/border-zinc-300 dark:border-zinc-600 data-\[state=checked\]:bg-zinc-900 data-\[state=checked\]:border-zinc-900 dark:data-\[state=checked\]:bg-white dark:data-\[state=checked\]:border-white dark:data-\[state=checked\]:text-black/g, 'border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground'],
  [/text-zinc-400 dark:text-zinc-500 line-through/g, 'text-muted-foreground line-through'],
  [/text-zinc-700 dark:text-zinc-200/g, 'text-foreground'],
  [/text-zinc-500 border-zinc-200 dark:border-zinc-800/g, 'text-muted-foreground border-border'],
  [/text-zinc-400 border-dashed border-zinc-200 dark:border-zinc-800/g, 'text-muted-foreground border-dashed border-border']
]);

replaceInFile('app/(erp)/dashboard/page.tsx', [
  [/text-zinc-900 dark:text-zinc-50/g, 'text-foreground'],
  [/text-zinc-500/g, 'text-muted-foreground']
]);

console.log("Done");
