import type { HTMLAttributes, ReactNode } from 'react';

interface GameHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  level?: 2 | 3;
  tone?: 'page' | 'section';
}

export function GameHeading({ children, className, level = 2, tone = 'page', ...props }: GameHeadingProps) {
  const Heading = `h${level}` as 'h2' | 'h3';
  const classes = ['game-heading', `game-heading--${tone}`, className].filter(Boolean).join(' ');

  return (
    <Heading className={classes} {...props}>
      {children}
    </Heading>
  );
}
