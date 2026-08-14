import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  R4A_RECIPES,
  encodeMonoPcm16Wav,
  renderCandidate,
  validateRecipes,
} from './recipes.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const assetDirectory = path.join(root, 'assets');
const recipeErrors = validateRecipes();
if (recipeErrors.length > 0) throw new Error(recipeErrors.join('\n'));

await mkdir(assetDirectory, { recursive: true });
for (const id of Object.keys(R4A_RECIPES)) {
  const samples = renderCandidate(id);
  await writeFile(path.join(assetDirectory, `${id}.wav`), encodeMonoPcm16Wav(samples));
}

console.log(`Rendered ${Object.keys(R4A_RECIPES).length} original R4A candidates at 48 kHz mono PCM16.`);
