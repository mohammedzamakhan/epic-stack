import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { Button } from '@base-ui/react/button';
import { renderToString } from 'react-dom/server';

console.log(renderToString(
  <Menu.Root>
    <Menu.Trigger
      render={
        <Button
          render={<a href="/hello" className="button-class" />}
        />
      }
    >
      <span>Content</span>
    </Menu.Trigger>
  </Menu.Root>
));
