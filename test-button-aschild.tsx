import * as React from 'react';
import { Button } from './packages/ui/components/ui/button';
import { renderToString } from 'react-dom/server';

const Link = React.forwardRef(({ to, className, children, ...props }: any, ref) => (
  <a href={to} className={className} ref={ref} {...props}>
    {children}
  </a>
));

// We'll see how base-ui does "asChild"
// It looks like base-ui button uses `render` prop.
// So Button inside Button using render prop
