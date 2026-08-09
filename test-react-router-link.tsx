import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { Button } from '@base-ui/react/button';
import { renderToString } from 'react-dom/server';

const Link = React.forwardRef(({ to, className, children, ...props }: any, ref) => (
  <a href={to} className={className} ref={ref} {...props}>
    {children}
  </a>
));

console.log(renderToString(
  <Menu.Root>
    <Menu.Trigger
      render={
        <Button
          className="button-class"
          render={
            <Link to="/users/test" onClick={() => {}} className="flex items-center gap-2" />
          }
        />
      }
    >
      <img src="avatar.jpg" alt="user" />
      <span>User Name</span>
    </Menu.Trigger>
  </Menu.Root>
));
