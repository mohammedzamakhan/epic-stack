const fs = require('fs');
const journalPath = '.Jules/palette.md';
let journal = '';
if (fs.existsSync(journalPath)) {
  journal = fs.readFileSync(journalPath, 'utf8');
} else {
  fs.mkdirSync('.Jules', { recursive: true });
}
const date = new Date().toISOString().split('T')[0];
const entry = `\n## ${date} - [@base-ui component composition]\n**Learning:** When using @base-ui React components with custom wrapping components (like Link from react-router), the 'asChild' pattern is implemented using the \`render\` prop on the Trigger/Item components (e.g. \`<Button render={<Link to="..." />} />\`), which allows merging accessibility attributes seamlessly while preserving the HTML semantics of the child.\n**Action:** Apply the \`render\` prop instead of children when needing to make a @base-ui component act as a link (e.g. Button, Menu.Item).\n`;
fs.writeFileSync(journalPath, journal + entry);
