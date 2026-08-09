import * as React from 'react';
import { DropdownMenu, DropdownMenuTrigger } from './packages/ui/components/ui/dropdown-menu';
import { Button } from './packages/ui/components/ui/button';
import { renderToString } from 'react-dom/server';

const Link = (props: any) => <a {...props} />;

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
      <span>User Name</span>
    </DropdownMenuTrigger>
  </DropdownMenu>
));
