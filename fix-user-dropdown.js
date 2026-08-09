const fs = require('fs');
const content = fs.readFileSync('apps/app/app/components/user-dropdown.tsx', 'utf8');
const fixed = content.replace(
  /<DropdownMenuTrigger>\s*<Button variant="secondary">\s*<Link([\s\S]*?)<\/Link>\s*<\/Button>\s*<\/DropdownMenuTrigger>/,
  '<DropdownMenuTrigger\n\t\t\t\trender={\n\t\t\t\t\t<Button\n\t\t\t\t\t\tvariant="secondary"\n\t\t\t\t\t\trender={<Link$1/>}\n\t\t\t\t\t/>\n\t\t\t\t}\n\t\t\t/>'
);
fs.writeFileSync('apps/app/app/components/user-dropdown.tsx.fixed', fixed);
