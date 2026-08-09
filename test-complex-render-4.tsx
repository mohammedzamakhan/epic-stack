import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { Button } from '@base-ui/react/button';
import { renderToString } from 'react-dom/server';

const Link = (props: any) => <a {...props} />;

console.log(renderToString(
  <Menu.Root>
    <Menu.Trigger
      render={
        <Button
          className="button-class"
          render={
            <Link href="/users/test" onClick={() => {}} className="flex items-center" />
          }
        />
      }
    >
      <span>Content</span>
    </Menu.Trigger>
  </Menu.Root>
));
