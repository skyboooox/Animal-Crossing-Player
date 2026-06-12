import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Modal as AnimalModal } from 'animal-island-ui';
import type { ModalProps } from 'animal-island-ui';

const MODAL_EXIT_MS = 180;
const MODAL_MORPH_MS = 360;
const MODAL_MORPH_HANDOFF_MS = 180;
const MODAL_SURFACE_FALLBACK_BG = '#f8f1dc';
const MODAL_SURFACE_FALLBACK_BORDER = 'rgb(231 220 199 / 0.78)';
const MODAL_SURFACE_FALLBACK_RADIUS = '48px';
// Closed cubic paths keep matching command counts and C1 joins for seamless morphing.
const MODAL_LIQUID_CLIP_PATH_BASE =
  'M0.05 0.36 C0.04785 0.2697 0.0535 0.22798 0.075 0.19 C0.0965 0.15202 0.15628 0.11292 0.2 0.095 C0.24372 0.07708 0.3198 0.0693 0.38 0.065 C0.4402 0.0607 0.5598 0.0607 0.62 0.065 C0.6802 0.0693 0.75628 0.07708 0.8 0.095 C0.84372 0.11292 0.9035 0.15202 0.925 0.19 C0.9465 0.22798 0.9467 0.29263 0.95 0.36 C0.9533 0.42737 0.95373 0.59407 0.948 0.66 C0.94227 0.72593 0.93408 0.78273 0.91 0.82 C0.88592 0.85727 0.83877 0.89922 0.78 0.92 C0.72123 0.94078 0.58027 0.965 0.5 0.965 C0.41973 0.965 0.27877 0.94078 0.22 0.92 C0.16123 0.89922 0.11437 0.90027 0.09 0.82 C0.06563 0.73973 0.05215 0.4503 0.05 0.36 Z';
const MODAL_LIQUID_CLIP_PATH_A =
  'M0.066 0.346 C0.061 0.25 0.071 0.206 0.098 0.17 C0.125 0.134 0.188 0.096 0.234 0.08 C0.28 0.064 0.348 0.055 0.407 0.052 C0.466 0.049 0.58 0.053 0.64 0.06 C0.7 0.067 0.774 0.079 0.816 0.101 C0.858 0.123 0.904 0.167 0.919 0.208 C0.934 0.249 0.947 0.306 0.957 0.376 C0.967 0.446 0.959 0.612 0.943 0.68 C0.927 0.748 0.912 0.8 0.881 0.838 C0.85 0.876 0.817 0.903 0.755 0.926 C0.693 0.949 0.57 0.977 0.487 0.975 C0.404 0.973 0.252 0.944 0.188 0.913 C0.124 0.882 0.091 0.872 0.07 0.79 C0.049 0.708 0.071 0.442 0.066 0.346 Z';
const MODAL_LIQUID_CLIP_PATH_B =
  'M0.034 0.374 C0.031 0.282 0.036 0.238 0.055 0.202 C0.074 0.166 0.128 0.127 0.174 0.106 C0.22 0.085 0.3 0.075 0.365 0.068 C0.43 0.061 0.548 0.055 0.608 0.058 C0.668 0.061 0.746 0.067 0.791 0.084 C0.836 0.101 0.913 0.137 0.936 0.174 C0.959 0.211 0.939 0.275 0.934 0.345 C0.929 0.415 0.956 0.58 0.948 0.649 C0.94 0.718 0.94 0.779 0.918 0.822 C0.896 0.865 0.85 0.914 0.79 0.935 C0.73 0.956 0.588 0.964 0.511 0.958 C0.434 0.952 0.305 0.946 0.244 0.929 C0.183 0.912 0.092 0.917 0.062 0.835 C0.032 0.753 0.037 0.466 0.034 0.374 Z';
const MODAL_LIQUID_CLIP_PATH_C =
  'M0.047 0.356 C0.04 0.263 0.051 0.216 0.078 0.181 C0.105 0.146 0.168 0.109 0.216 0.089 C0.264 0.069 0.334 0.06 0.394 0.055 C0.454 0.05 0.561 0.049 0.622 0.056 C0.683 0.063 0.762 0.077 0.807 0.097 C0.852 0.117 0.91 0.154 0.937 0.195 C0.964 0.236 0.967 0.296 0.972 0.369 C0.977 0.442 0.968 0.6 0.956 0.671 C0.944 0.742 0.929 0.793 0.897 0.834 C0.865 0.875 0.83 0.908 0.769 0.93 C0.708 0.952 0.58 0.973 0.497 0.972 C0.414 0.971 0.27 0.948 0.207 0.924 C0.144 0.9 0.101 0.89 0.076 0.807 C0.051 0.724 0.054 0.449 0.047 0.356 Z';
const MODAL_LIQUID_CLIP_PATH_VALUES = [
  MODAL_LIQUID_CLIP_PATH_BASE,
  MODAL_LIQUID_CLIP_PATH_A,
  MODAL_LIQUID_CLIP_PATH_B,
  MODAL_LIQUID_CLIP_PATH_C,
  MODAL_LIQUID_CLIP_PATH_BASE,
].join(';');
let modalMotionId = 0;

export interface ModalMotionOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: string;
  backgroundColor?: string;
  boxShadow?: string;
  borderColor?: string;
  borderWidth?: string;
  color?: string;
  iconSrc?: string;
  label?: string;
}

type AppModalProps = ModalProps & {
  motionOrigin?: ModalMotionOrigin | null;
};

interface ModalMorphFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: string;
  backgroundColor: string;
  boxShadow: string;
  borderColor: string;
  borderWidth: string;
  color: string;
  iconSrc?: string;
  label?: string;
}

interface ModalMorphState {
  from: ModalMorphFrame;
  to: ModalMorphFrame;
}

function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function nextMotionId(): number {
  modalMotionId += 1;
  return modalMotionId;
}

function px(value: number): string {
  return `${Math.round(value)}px`;
}

function scaleRatio(from: number, to: number): string {
  if (to <= 0) {
    return '1';
  }

  return Math.max(from / to, 0.001).toFixed(4);
}

function visibleCssValue(value: string | undefined, fallback: string): string {
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') {
    return fallback;
  }

  return value;
}

function getModalSurface(element: HTMLElement): HTMLElement {
  return element.querySelector<HTMLElement>('[class*="animal-modalClipped"]') ?? element;
}

function getMorphState(element: HTMLElement, origin: ModalMotionOrigin): ModalMorphState | null {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  const surface = getModalSurface(element);
  const surfaceStyle = getComputedStyle(surface);

  return {
    from: {
      x: origin.x,
      y: origin.y,
      width: origin.width,
      height: origin.height,
      borderRadius: origin.borderRadius ?? '999px',
      backgroundColor: visibleCssValue(origin.backgroundColor, '#d7ecfb'),
      boxShadow: origin.boxShadow && origin.boxShadow !== 'none' ? origin.boxShadow : '0 4px 0 rgb(101 84 61 / 0.28)',
      borderColor: visibleCssValue(origin.borderColor, 'rgb(136 171 205 / 0.8)'),
      borderWidth: origin.borderWidth ?? '2px',
      color: visibleCssValue(origin.color, '#6d5a3e'),
      iconSrc: origin.iconSrc,
      label: origin.label,
    },
    to: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      borderRadius: visibleCssValue(surfaceStyle.borderRadius, MODAL_SURFACE_FALLBACK_RADIUS),
      backgroundColor: visibleCssValue(surfaceStyle.backgroundColor, MODAL_SURFACE_FALLBACK_BG),
      boxShadow: surfaceStyle.boxShadow && surfaceStyle.boxShadow !== 'none' ? surfaceStyle.boxShadow : '0 20px 36px rgb(50 70 72 / 0.22)',
      borderColor: visibleCssValue(surfaceStyle.borderColor, MODAL_SURFACE_FALLBACK_BORDER),
      borderWidth: surfaceStyle.borderWidth || '0px',
      color: visibleCssValue(surfaceStyle.color, '#6d5a3e'),
    },
  };
}

function createMorphStyle(morph: ModalMorphState): CSSProperties {
  const midX = morph.to.x + morph.to.width / 2 - morph.from.width / 2;
  const midY = morph.to.y + morph.to.height / 2 - morph.from.height / 2;
  const fromTranslateX = morph.from.x - morph.to.x;
  const fromTranslateY = morph.from.y - morph.to.y;
  const midTranslateX = midX - morph.to.x;
  const midTranslateY = midY - morph.to.y;

  return {
    '--app-morph-from-x': px(morph.from.x),
    '--app-morph-from-y': px(morph.from.y),
    '--app-morph-from-w': px(morph.from.width),
    '--app-morph-from-h': px(morph.from.height),
    '--app-morph-from-radius': morph.from.borderRadius,
    '--app-morph-from-bg': morph.from.backgroundColor,
    '--app-morph-from-shadow': morph.from.boxShadow,
    '--app-morph-from-border': morph.from.borderColor,
    '--app-morph-from-border-width': morph.from.borderWidth,
    '--app-morph-from-color': morph.from.color,
    '--app-morph-mid-x': px(midX),
    '--app-morph-mid-y': px(midY),
    '--app-morph-to-x': px(morph.to.x),
    '--app-morph-to-y': px(morph.to.y),
    '--app-morph-to-w': px(morph.to.width),
    '--app-morph-to-h': px(morph.to.height),
    '--app-morph-to-radius': morph.to.borderRadius,
    '--app-morph-to-bg': morph.to.backgroundColor,
    '--app-morph-to-shadow': morph.to.boxShadow,
    '--app-morph-to-border': morph.to.borderColor,
    '--app-morph-to-border-width': morph.to.borderWidth,
    '--app-morph-from-translate-x': px(fromTranslateX),
    '--app-morph-from-translate-y': px(fromTranslateY),
    '--app-morph-mid-translate-x': px(midTranslateX),
    '--app-morph-mid-translate-y': px(midTranslateY),
    '--app-morph-from-scale-x': scaleRatio(morph.from.width, morph.to.width),
    '--app-morph-from-scale-y': scaleRatio(morph.from.height, morph.to.height),
  } as CSSProperties;
}

export function Modal({ open, className, maskStyle, motionOrigin, ...props }: AppModalProps) {
  const idsRef = useRef<{ clipId: string; motionClass: string } | null>(null);
  if (!idsRef.current) {
    const motionId = nextMotionId();
    idsRef.current = {
      clipId: `app-modal-liquid-clip-${motionId}`,
      motionClass: `app-modal-motion-${motionId}`,
    };
  }
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [morph, setMorph] = useState<ModalMorphState | null>(null);
  const [morphComplete, setMorphComplete] = useState(false);
  const morphStartedRef = useRef(false);
  const { clipId, motionClass } = idsRef.current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setMorph(null);
      setMorphComplete(false);
      morphStartedRef.current = false;
    }
  }, [motionOrigin, open]);

  useEffect(() => {
    if (open || !mounted) {
      return undefined;
    }

    setMorph(null);
    setMorphComplete(true);
    morphStartedRef.current = false;

    if (shouldReduceMotion()) {
      setClosing(false);
      setMounted(false);
      return undefined;
    }

    setClosing(true);
    const timeout = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, MODAL_EXIT_MS);

    return () => window.clearTimeout(timeout);
  }, [mounted, open]);

  useLayoutEffect(() => {
    if (!mounted || closing || !motionOrigin) {
      return;
    }

    const element = document.querySelector<HTMLElement>(`.${motionClass}`);
    if (!element) {
      return;
    }

    if (shouldReduceMotion()) {
      setMorph(null);
      setMorphComplete(true);
      return;
    }

    if (morphStartedRef.current) {
      return;
    }

    const nextMorph = getMorphState(element, motionOrigin);
    if (!nextMorph) {
      setMorphComplete(true);
      return;
    }

    morphStartedRef.current = true;
    setMorph(nextMorph);

    const revealTimeout = window.setTimeout(() => {
      setMorphComplete(true);
    }, MODAL_MORPH_MS);
    const removeTimeout = window.setTimeout(() => {
      setMorph(null);
    }, MODAL_MORPH_MS + MODAL_MORPH_HANDOFF_MS);

    return () => {
      window.clearTimeout(revealTimeout);
      window.clearTimeout(removeTimeout);
    };
  }, [closing, mounted, motionClass, motionOrigin]);

  useLayoutEffect(() => {
    if (!mounted || shouldReduceMotion()) {
      return undefined;
    }

    const element = document.querySelector<HTMLElement>(`.${motionClass}`);
    if (!element) {
      return undefined;
    }

    element.style.setProperty('--app-modal-liquid-clip', `url(#${clipId})`);

    return () => {
      element.style.removeProperty('--app-modal-liquid-clip');
    };
  }, [clipId, mounted, motionClass]);

  if (!mounted) {
    return null;
  }

  const reduceMotion = shouldReduceMotion();
  const morphPending = Boolean(motionOrigin) && !closing && !morphComplete && !reduceMotion;
  const mergedClassName = [
    className,
    motionClass,
    !reduceMotion ? 'app-modal--liquid-clip' : null,
    closing ? 'app-modal--closing' : null,
    morphPending ? 'app-modal--morph-hidden' : null,
    motionOrigin && morphComplete && !closing && !reduceMotion ? 'app-modal--morph-ready' : null,
  ]
    .filter(Boolean)
    .join(' ');
  const mergedMaskStyle: CSSProperties | undefined = closing
    ? { ...maskStyle, animation: 'app-mask-exit var(--app-motion-exit) var(--app-motion-ease-in) both' }
    : maskStyle;

  return (
    <>
      {typeof document !== 'undefined' && mounted && !reduceMotion
        ? createPortal(
            <svg aria-hidden="true" className="app-liquid-defs" focusable="false">
              <defs>
                <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                  <path d={MODAL_LIQUID_CLIP_PATH_BASE}>
                    <animate
                      attributeName="d"
                      calcMode="spline"
                      dur="10.4s"
                      keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
                      keyTimes="0;0.24;0.52;0.76;1"
                      repeatCount="indefinite"
                      values={MODAL_LIQUID_CLIP_PATH_VALUES}
                    />
                  </path>
                </clipPath>
              </defs>
            </svg>,
            document.body,
          )
        : null}
      {morph ? (
        <div
          aria-hidden="true"
          className={`app-modal-morph ${morphComplete ? 'app-modal-morph--handoff' : ''}`}
          data-testid="modal-button-morph"
          style={createMorphStyle(morph)}
        >
          <span className="app-modal-morph__pill">
            {morph.from.iconSrc || morph.from.label ? (
              <span className="app-modal-morph__content">
                {morph.from.iconSrc ? <img alt="" className="app-modal-morph__icon" src={morph.from.iconSrc} /> : null}
                {morph.from.label ? <span>{morph.from.label}</span> : null}
              </span>
            ) : null}
          </span>
          <span className="app-modal-morph__blob" />
        </div>
      ) : null}
      <AnimalModal {...props} open className={mergedClassName} maskStyle={mergedMaskStyle} />
    </>
  );
}

export {
  Button,
  Card,
  Icon,
  Input,
  Loading,
  Radio,
  Select,
  Switch,
  Table,
  Tooltip,
} from 'animal-island-ui';

export type { CardProps, IconName, TableColumn } from 'animal-island-ui';
