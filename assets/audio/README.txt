Place narration audio files here to activate playback on Page 11:

  ru.mp3   — Russian narration
  en.mp3   — English narration

app.js already wires the 🔊 Russian / 🔊 English / 🔇 Stop buttons to a UI
state (see initAudioControls). To actually play sound, uncomment and adapt
the commented-out Audio() lines inside that function once files exist here.

No audio autoplays anywhere in this site — playback only ever starts from
an explicit button press, by design.
