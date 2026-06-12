import type { BackgroundSettings } from '../../L4_Atom/types';
import { getPublicAssetUrl } from '../../L4_Atom/utils/publicAssetUrl';

export interface ResolvedBackground {
  kind: BackgroundSettings['kind'];
  cssBackground: string;
  label: string;
}

export function getPresetBackgroundUrl(id: string | null = '0'): string {
  const presetId = id ?? '0';
  const extension = ['3', '4', '6', '8'].includes(presetId) ? 'jpeg' : 'jpg';
  return getPublicAssetUrl(`assets/backgroundPreset/${presetId}.${extension}`);
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
  return {
    kind: 'preset',
    cssBackground: `url("${getPresetBackgroundUrl(id)}") center / cover no-repeat`,
    label: `Preset ${id}`,
  };
}
