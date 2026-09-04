import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export const fixturePath = (...segments: string[]): string => join(fixturesDirectory, ...segments);
