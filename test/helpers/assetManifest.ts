import type { AudioManifest } from '../../src/L2_Core/types';

export const fixtureManifest: AudioManifest = {
  'New Horizons (Switch 2021)': {
    Sunny: Array.from({ length: 24 }, (_, hour) => `/nh/sunny-${hour}.mp3`),
    Rainy: Array.from({ length: 24 }, (_, hour) => `/nh/rainy-${hour}.mp3`),
    Snowy: Array.from({ length: 24 }, (_, hour) => `/nh/snowy-${hour}.mp3`),
  },
  'New Leaf (3DS 2012)': {
    Sunny: Array.from({ length: 24 }, (_, hour) => `/nl/sunny-${hour}.mp3`),
    Rainy: Array.from({ length: 24 }, (_, hour) => `/nl/rainy-${hour}.mp3`),
    Snowy: Array.from({ length: 24 }, (_, hour) => `/nl/snowy-${hour}.mp3`),
  },
  'City Folk (Wii 2008)': {
    Sunny: Array.from({ length: 24 }, (_, hour) => `/cf/sunny-${hour}.mp3`),
    Rainy: Array.from({ length: 24 }, (_, hour) => `/cf/rainy-${hour}.mp3`),
    Snowy: Array.from({ length: 24 }, (_, hour) => `/cf/snowy-${hour}.mp3`),
  },
  'Wild World (DS 2005)': {
    Sunny: Array.from({ length: 24 }, (_, hour) => `/ww/sunny-${hour}.mp3`),
  },
};
