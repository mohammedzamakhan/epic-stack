import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { renderToString } from 'react-dom/server';

console.log(renderToString(<Button render={<a href="/test" />}>Test</Button>));
