## Can I park here mobile app - Analyzing parking signs to prevent users from getting parking tickets and car towed
Built using codex, openai's coding agent

Tech stack: Expo, React Native, Codex, Openai gpt 4.1 api, typescript


## tasks not to be forgotten

From codex openai chat

Here’s what I’d shore up before handing the app to outside testers/production:

Secure API access – the OpenAI key lives in the client bundle; anyone installing the app will see it. Either proxy requests through your own backend or inject secrets at build time so testers can run it safely.
Loading & error states – after tapping Find Out the UI doesn’t indicate that work is happening (and the button stays active). Add a spinner/disabled state and surface API failures inside the dialog so testers aren’t guessing.
Time selection controls – the clock is read-only now. Testers need a way to simulate different parking times; bring back (or redesign) a manual picker or scenario presets.
Photo ingestion flexibility – only live camera capture is supported. Give testers a “choose from library” option so they can reuse sample signs or retry without retaking photos.
Result clarity & history – the modal disappears forever once closed. Consider storing the last response, offering a “View Previous Result,” and adding context (confidence, warnings) so testers can evaluate consistency.
Instrumentation & logging – light analytics or structured console logs (hidden behind a debug toggle) will help you interpret tester feedback without relying on them to describe every interaction.

