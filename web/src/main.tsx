// @ts-ignore: React types are unavailable in this project.
import React from 'react';
// @ts-ignore: react-dom/client types are unavailable in this project.
import { createRoot } from 'react-dom/client';
import App from './App';
// The bundler handles this stylesheet import; TypeScript has no declaration for CSS files.
// @ts-ignore
import './styles/theme.css';

import './styles/classes.css';


const root = createRoot(document.getElementById('root')!);
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(App)
  )
);