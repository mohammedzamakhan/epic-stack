const fs = require('fs');
let content = fs.readFileSync('apps/app/app/components/ui/header.tsx', 'utf8');
content = content.replace(
  /<Button variant="ghost" size="sm">\s*<Link to={item\.href} className="text-base">\s*<span>{item\.name}<\/span>\s*<\/Link>\s*<\/Button>/g,
  '<Button variant="ghost" size="sm" render={<Link to={item.href} className="text-base" />}>\n\t\t\t\t\t\t\t\t\t\t\t\t\t<span>{item.name}</span>\n\t\t\t\t\t\t\t\t\t\t\t\t</Button>'
);
content = content.replace(
  /<Button\s*variant="ghost"\s*size="sm"\s*className={cn\(isScrolled && 'lg:hidden'\)}\s*>\s*<Link to="\/login">\s*<span>Login<\/span>\s*<\/Link>\s*<\/Button>/g,
  '<Button\n\t\t\t\t\t\t\t\t\t\t\tvariant="ghost"\n\t\t\t\t\t\t\t\t\t\t\tsize="sm"\n\t\t\t\t\t\t\t\t\t\t\tclassName={cn(isScrolled && \'lg:hidden\')}\n\t\t\t\t\t\t\t\t\t\t\trender={<Link to="/login" />}\n\t\t\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\t\t\t<span>Login</span>\n\t\t\t\t\t\t\t\t\t\t</Button>'
);
content = content.replace(
  /<Button size="sm" className={cn\(isScrolled && 'lg:hidden'\)}>\s*<Link to="\/signup">\s*<span>\s*<Trans>Sign Up<\/Trans>\s*<\/span>\s*<\/Link>\s*<\/Button>/g,
  '<Button size="sm" className={cn(isScrolled && \'lg:hidden\')} render={<Link to="/signup" />}>\n\t\t\t\t\t\t\t\t\t\t\t<span>\n\t\t\t\t\t\t\t\t\t\t\t\t<Trans>Sign Up</Trans>\n\t\t\t\t\t\t\t\t\t\t\t</span>\n\t\t\t\t\t\t\t\t\t\t</Button>'
);
content = content.replace(
  /<Button\s*size="sm"\s*className={cn\(isScrolled \? 'lg:inline-flex' : 'hidden'\)}\s*>\s*<Link to="\/signup">\s*<span>\s*<Trans>Get Started<\/Trans>\s*<\/span>\s*<\/Link>\s*<\/Button>/g,
  '<Button\n\t\t\t\t\t\t\t\t\t\t\tsize="sm"\n\t\t\t\t\t\t\t\t\t\t\tclassName={cn(isScrolled ? \'lg:inline-flex\' : \'hidden\')}\n\t\t\t\t\t\t\t\t\t\t\trender={<Link to="/signup" />}\n\t\t\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\t\t\t<span>\n\t\t\t\t\t\t\t\t\t\t\t\t<Trans>Get Started</Trans>\n\t\t\t\t\t\t\t\t\t\t\t</span>\n\t\t\t\t\t\t\t\t\t\t</Button>'
);
content = content.replace(
  /<Button size="sm">\s*<Link\s*to={\s*currentOrganization\s*\?\s*`\/\$\{currentOrganization\.organization\.slug\}`\s*:\s*'\/app'\s*}\s*>\s*<span>Dashboard<\/span>\s*<\/Link>\s*<\/Button>/g,
  '<Button\n\t\t\t\t\t\t\t\t\t\t\tsize="sm"\n\t\t\t\t\t\t\t\t\t\t\trender={\n\t\t\t\t\t\t\t\t\t\t\t\t<Link\n\t\t\t\t\t\t\t\t\t\t\t\t\tto={\n\t\t\t\t\t\t\t\t\t\t\t\t\t\tcurrentOrganization\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t? `/${currentOrganization.organization.slug}`\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t: \'/app\'\n\t\t\t\t\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t\t\t\t\t/>\n\t\t\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\t\t\t<span>Dashboard</span>\n\t\t\t\t\t\t\t\t\t\t</Button>'
);

fs.writeFileSync('apps/app/app/components/ui/header.tsx.fixed', content);
