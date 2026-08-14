import { measureCompleteGraphs } from './audioGraph';

declare global {
  interface Window {
    __R4A_METRIC_RESULT__?: Awaited<ReturnType<typeof measureCompleteGraphs>>;
    __R4A_METRIC_ERROR__?: string;
  }
}

measureCompleteGraphs()
  .then((result) => { window.__R4A_METRIC_RESULT__ = result; })
  .catch((error) => { window.__R4A_METRIC_ERROR__ = error instanceof Error ? error.message : String(error); });
