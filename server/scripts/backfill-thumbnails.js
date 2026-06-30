import 'dotenv/config';
import { runThumbnailBackfill } from '../src/services/thumbnailBackfill.js';

try {
  const summary = await runThumbnailBackfill();
  console.log('[thumbnail-backfill] Complete:', JSON.stringify(summary));
} catch (error) {
  console.error('[thumbnail-backfill] Aborted:', error?.message ?? String(error));
  process.exitCode = 1;
}
