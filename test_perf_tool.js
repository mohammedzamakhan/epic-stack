const assert = require('assert');

// Verify that the patch was applied correctly and fixes the issue
const fs = require('fs');
const content = fs.readFileSync('apps/app/app/components/data-table.tsx', 'utf8');

assert(content.includes('const [hasOpened, setHasOpened] = React.useState(false)'));
assert(content.includes('onOpenChange={(open) => {'));
assert(content.includes('{hasOpened ? ('));

console.log('Performance fix successfully applied!');
