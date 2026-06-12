import { type ReactNode, type Ref, useLayoutEffect, useRef, useState } from 'react';

interface AnimatedPanelProps {
  animationKey: string;
  children: ReactNode;
  className?: string;
  fixed?: boolean;
  panelRef?: Ref<HTMLDivElement>;
}

export function AnimatedPanel({ animationKey, children, className, fixed = false, panelRef }: AnimatedPanelProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (fixed) {
      setHeight(null);
      return undefined;
    }

    const content = contentRef.current;
    if (!content) {
      return undefined;
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(content.getBoundingClientRect().height);
      setHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);

    return () => observer.disconnect();
  }, [animationKey, fixed]);

  return (
    <div
      ref={panelRef}
      className={['animated-panel', fixed ? 'animated-panel--fixed' : null, className].filter(Boolean).join(' ')}
      style={height === null ? undefined : { height }}
    >
      <div key={animationKey} ref={contentRef} className="animated-panel__content">
        {children}
      </div>
    </div>
  );
}
