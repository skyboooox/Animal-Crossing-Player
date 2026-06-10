import type { BackgroundSettings } from '../../L4_Atom/types';

export interface ResolvedBackground {
  kind: BackgroundSettings['kind'];
  cssBackground: string;
  label: string;
}

export function resolveBackground(settings: BackgroundSettings, uploadedUrl: string | null = null): ResolvedBackground {
  if (settings.kind === 'solid') {
    return {
      kind: 'solid',
      cssBackground: settings.solidColor,
      label: 'Solid color',
    };
  }

  if (settings.kind === 'uploaded' && uploadedUrl) {
    return {
      kind: 'uploaded',
      cssBackground: `url("${uploadedUrl}") center / cover no-repeat`,
      label: 'Uploaded background',
    };
  }

  const id = settings.presetId ?? '0';
  const extension = ['3', '4', '6', '8'].includes(id) ? 'jpeg' : 'jpg';
  return {
    kind: 'preset',
    cssBackground: `url("/assets/backgroundPreset/${id}.${extension}") center / cover no-repeat`,
    label: `Preset ${id}`,
  };
}
