# T37 audio audition R5

R5 is a human-listening gate, not a production audio integration.

- R4 is rejected and remains only as rollback evidence.
- Action A restores the exact T28 `35509a7` recipes and mixer.
- Action B restores the exact T29 `ca5da48` recipes and mixer.
- Left/right add only disclosed `-0.28 / +0.28` stereo pan; all other recipe values are
  unchanged from their historical source.
- Ice presents three independent CC0 real-ice recordings. Each plays one automatically
  selected peak-centred window at original speed with a 3 ms de-click ramp. There is no
  spell, wind, pitch shift, low-pass family, or layered shatter.
- Accepted Studio clear 1/2/3, countdown, and four-pulse clear 4 are displayed only as
  frozen status. R5 does not reopen them as controls.

The Freesound pages and local audition hashes are recorded in `provenance.json`.
Freesound login is required for original WAV downloads, so this listening page vendors
the site's generated HQ OGG previews. Production adoption requires downloading and
hashing the selected uploader-original WAV.

Run the verifier from the repository root:

```powershell
node docs/evidence/t37/audio-audition-r5/verify-audition.mjs
```

Or serve the repository and open:

```text
http://127.0.0.1:<port>/docs/evidence/t37/audio-audition-r5/
```
