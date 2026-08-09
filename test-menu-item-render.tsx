import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { renderToString } from 'react-dom/server';

const Link = React.forwardRef(({ to, className, children, ...props }: any, ref) => (
  <a href={to} className={className} ref={ref} {...props}>
    {children}
  </a>
));

console.log(renderToString(
  <Menu.Root>
    <Menu.Item render={<Link to="/profile" className="menu-item-class" />}>
      Profile
    </Menu.Item>
  </Menu.Root>
));
