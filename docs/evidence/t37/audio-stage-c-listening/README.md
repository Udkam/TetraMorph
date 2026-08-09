# T37 Stage-C production listening surface

This page calls the committed production `AudioEngine` directly through Vite. It does
not copy frequencies, envelopes, buffers, or Mutation scheduling into evidence code.

Human status is fail-closed:

- Action A, Studio clear/countdown, and Ice 2 are frozen references.
- Utility/UI, Survival, outcomes, Bomb, Multiplier, and Supergravity remain listening
  candidates even when the automated browser audit passes.

Run the self-contained browser verifier:

```powershell
node docs/evidence/t37/audio-stage-c-listening/verify-audition.mjs
```

For manual listening, start the repository Vite server and open:

```text
/docs/evidence/t37/audio-stage-c-listening/index.html
```

Use ordinary device volume. The final button intentionally sends Bomb, Ice,
Supergravity, and Multiplier in one Core batch so production serialization can be heard.
