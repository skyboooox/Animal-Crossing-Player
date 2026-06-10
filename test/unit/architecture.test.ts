import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function importsOf(file: string): string {
  return readFileSync(join(SRC, file), 'utf8');
}

describe('architecture boundaries', () => {
  it('L4 does not import upper layers', () => {
    const files = [
      'L4_Atom/assetManifest/loadAudioManifest.ts',
      'L4_Atom/audio/audioBufferLoader.ts',
      'L4_Atom/audio/webAudio.ts',
      'L4_Atom/mqtt/mqttClient.ts',
      'L4_Atom/mqtt/mqttJson.ts',
      'L4_Atom/weatherApi/openMeteoClient.ts',
    ];

    for (const file of files) {
      expect(importsOf(file)).not.toMatch(/L[123]_/);
    }
  });

  it('MQTT entry remains in L1 and delegates to lower layers', () => {
    const entry = importsOf('L1_Entry/adapters/mqttCommandEntry.ts');
    expect(entry).toContain('parseMqttJson');
    expect(entry).toContain('isRemoteCommand');
  });
});
