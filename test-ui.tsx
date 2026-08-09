import * as React from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuItem } from './packages/ui/components/ui/dropdown-menu';
import { Button } from './packages/ui/components/ui/button';
import { renderToString } from 'react-dom/server';

const Link = React.forwardRef(({ to, className, children, ...props }: any, ref) => (
  <a href={to} className={className} ref={ref} {...props}>
    {children}
  </a>
));

console.log(renderToString(
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          variant="secondary"
          render={<Link to="/users/test" onClick={() => {}} className="flex items-center gap-2" />}
        />
      }
    >
      <img src="avatar.jpg" alt="user" />
      <span>User Name</span>
    </DropdownMenuTrigger>
  </DropdownMenu>
));
