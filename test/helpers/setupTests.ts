import '@testing-library/jest-dom/vitest';

vi.mock('animal-island-ui', async () => {
  const React = await import('react');
  const passthrough = (tag: keyof React.JSX.IntrinsicElements) =>
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag, props, children);

  return {
    Button: passthrough('button'),
    Card: passthrough('section'),
    Icon: passthrough('span'),
    Input: passthrough('input'),
    Loading: ({ text = 'Loading' }: { text?: string }) => React.createElement('span', null, text),
    Modal: ({ children, open = true }: React.PropsWithChildren<{ open?: boolean }>) =>
      open ? React.createElement('div', { role: 'dialog' }, children) : null,
    Select: passthrough('select'),
    Switch: passthrough('input'),
    Title: passthrough('h2'),
    Tooltip: passthrough('span'),
  };
});
