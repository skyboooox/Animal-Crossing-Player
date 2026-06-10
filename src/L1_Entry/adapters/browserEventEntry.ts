export function onVisibilityChange(callback: (visible: boolean) => void): () => void {
  const listener = () => callback(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}
