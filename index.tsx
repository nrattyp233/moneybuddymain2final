
console.log("[v0] index.tsx loading...");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("[v0] imports resolved, looking for root element");
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log("[v0] root element found, creating React root");
const root = ReactDOM.createRoot(rootElement);
console.log("[v0] rendering App component");
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
