import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { renderToString } from 'react-dom/server';

console.log(renderToString(
  <Menu.Root>
    <Menu.Trigger>Trigger</Menu.Trigger>
  </Menu.Root>
));
