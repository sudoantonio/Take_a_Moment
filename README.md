# A moment for you · BFP MVP

English review prototype of the BFP flow, with all 21 practices from the supplied exercise sheet. Static ES modules; no external dependencies or build step.

## Run

```sh
npm start
```

Open the printed local URL. HTTPS or localhost is required for service workers. `BFP_PORT` changes the default port, 8780.

```sh
npm test
npm run check
```

## Implemented

- All 21 practices from BFP's supplied one-page exercise sheet, organized into Breathing, Body, Everyday and Connection. Each opens immediately in an immersive full-screen setting with a short cue, pause and immediate exit. Illustrations are original SVG; there are no remote media dependencies.
- Natural mindful breathing uses a visual anchor without asking the user to synchronize their breath. Separate 4-7-8 and box guides trace a circle and square. The 4-7-8 guide uses the supplied 4/7/8 timing; the square uses a four-second-per-side prototype default from NHS guidance. Every hold can be skipped. Timing is not a measurement of the user's breathing.
- The other practices use three short, user-paced cues appropriate to the original exercise. Movement is optional and respects reduced motion. The app pauses motion when hidden. Listening guides the user to their own music; it does not supply music or access a microphone. Washing, eating, hugging and other everyday practices guide a real-world activity without claiming to sense whether it happened.
- Visuals and simplified copy are prototype adaptations pending BFP review. All 21 activities have a printable text version and are included in the explicit offline package.
- Community-first support page: public Virtual Sangha gathering link, in-person group enquiries and mentorship, followed by phone, user-controlled message and the original 21-exercise PDF download. Gathering information comes from BFP’s [Sangha](https://boundlessfreedom.org/sangha) and [Programs](https://boundlessfreedom.org/our-work) pages, checked 24 October 2026. Meeting details are confirmed on the official site; no public in-person venues have been verified, so no location pins, nearby matches or member positions are invented.
- Minimal contact preferences, review and explicit consent.
- Contact via the real BFP telephone number or a user-controlled email draft. The website never sends an email, creates a ticket, or claims that BFP received a request.
- Explicit offline download of public app resources. A service worker validates the entire package before showing confirmation. Cached practices survive reload without the server. No form values or contact details are put in caches, localStorage, sessionStorage, URLs or analytics. Local practice metadata is described below.
- Practice now and catalogue Random start one of the 21 practices immediately, excluding the most recently opened practice. A local practice checkpoint (practice ID and last step only) resumes through Settings → Resume after reopening the same browser, including offline. Breathing starts a fresh expansion rather than restoring a partial breath; observation resumes its saved step. No identity or precise timestamps. Completed practices, Forget saved progress and Clear this session remove the checkpoint.
- Shared-device mode persists in this browser, removes the checkpoint and prevents further progress saving and offline downloads. Contact details remain temporary in all modes. Shared mode also removes daily activity history and stops recording completions. No reminders or tracking.

## Scope and release gates

This is an independent private MVP, not an official BFP service. Practice adaptations, Spanish translations, branding and operational information need BFP approval before a participant pilot.

The contact journey uses `mailto:` and `tel:`. A real request queue, reference numbers, staff assignment and delivery acknowledgements require an agreed BFP backend. No credentials or API endpoint were supplied; there is no simulated success state masquerading as delivery.

The sender's email address is exposed by their email client when they choose to send a draft, even when phone is their preferred callback method. The app explains this at review. People without a safe contact can obtain BFP's public contact details without submitting anything.

The private hosted version is for owner review. Its hosting access gate is distinct from the future account-free participant experience. Browser offline storage may be evicted; at least one online visit and an explicit completed download are required. No phone-based IVR or SMS is implemented in this slice.

## Maintenance

When changing cached files, bump `VERSION` in `dist/sw.js` and confirm a fresh complete offline download. Hosting must serve the app at its configured base scope, preserve service-worker MIME types, and avoid caching authentication pages. Reassess CSP and server headers when adding integrations. Avoid third-party analytics and remote speech voices on support pages.

Suggested production headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` and a tested CSP. The local preview supplies these headers; deployed edge headers depend on the hosting platform. A restrictive meta CSP is included in the static app.

## Publication status

The existing private Sites project is registered in `.openai/hosting.json`. Releases reuse this project and preserve owner-only access. The local app is independently runnable with `npm start`.

## Practice provenance

The supplied source is [BFP: 21 One-Minute Mindfulness Exercises](sources/bfp-21-mindfulness-exercises.pdf), shared in [BFP Supplementary Info](https://docs.google.com/document/d/1hJJ01tkCfTQUULHo7J_VfxVPbW_gC-diKIcM5JtY5a4/edit). It was reviewed as a complete one-page sheet before expanding the catalogue. Original titles are retained; the short cues and illustrations are adaptations, not a verbatim or clinically validated BFP course.

The square guide's four-second phases are a prototype choice supported by [NHS box breathing guidance](https://www.nnuh.nhs.uk/wp-content/uploads/2021/03/Relaxation-Information-Pack.pdf); the BFP sheet itself specifies following a square without timing each side. The 4-7-8 timing is explicit in the BFP sheet. Holds are optional and skippable. General guidance to keep breathing comfortable is consistent with [NHS breathing exercises for stress](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/).

## Local journey

The friendly user icon opens Your journey. Explicit Finish clicks record completed practices; opening or reloading a completion URL does not. Streaks use local calendar days, with yesterday’s streak retained until today ends. Daily practice counts, a Monday–Sunday calendar, best streak and practice-day milestones use up to 366 days of local records. Counts begin with this feature; earlier activity is not invented. The browser stores only date keys, allowlisted practice IDs and counts in `bfp-activity-v1`, separately from the checkpoint. Settings can clear the journey, including activity history and the saved place. Shared-device mode clears and disables it. A blocked browser store retains only session totals and says so. The local-community action prepares an enquiry to BFP; there are no verified nearby venue results and no geolocation request.

The journey uses the home card’s bold blue and original companion illustration. The current streak selects a flat blue shade at 0, 1, 3, 7, 14 and 30 days; headings stay white and the goal and settings surfaces remain opaque for readability. The next-goal card advances at 1, 3, 5, 10 and further completed-practice thresholds; more than one completion per day advances this goal while the streak counts only one calendar day.

The profile Settings gear opens local data controls. Save on this device uses the existing shared-device privacy preference: switching off clears the checkpoint and activity, blocks new journey saving and prevents new offline downloads. Existing public downloads can be removed through Manage downloads. About now links to Settings instead of duplicating these controls.

## Immersive visual practices

All 21 practices now use original local SVG environments in `dist/immersive.js`: sky and clouds, a garden detail, a moving body-scan highlight, grounded body practices, water, paths and thresholds, warm connection scenes and quieter attention scenes. Full-screen flat color and landscape layers extend behind the illustration; the catalogue keeps its compact previews. One brief cue and its short supporting line appear at a time. Practice controls are Pause, Next/Finish and Close; community access stays outside the practice.

Step routes preserve the mounted scene, including animation clocks and pause state, while updating the cue, progress dots and exact resume link. Body attention, stretching, sunrise, focus and the other settings change with the step. Natural breathing remains an unpaced attention anchor. Timed techniques retain their existing timings and optional, skippable holds. Motion pauses when the page is hidden, and reduced-motion preferences disable ambient animation and scene transitions. No gestures, sensors or new runtime dependencies are required. The optional voice and background audio is described below. The renderer is included in the explicit offline download.

The remaining practice illustrations now have dedicated full-size compositions as well: an opening doorway, a growing intention, a seated companion, real hand-washing shapes, progressive stepping stones, headphones and sound layers, a single focus object, and distinct kindness, compassion, hug and gratitude scenes. The hug figures begin apart and approach only with the user-paced consent cue. Catalogue glyphs are no longer reused as the main illustration for these practices.


## Voice and background audio

All 21 experiences have English ElevenLabs narration using Lauren (Friendly, Comforting and Soft), Eleven v4: 68 separate recordings. Nineteen practices have three independent, user-paced moments. The two timed breathing techniques have their own introduction, short phase cues and closing invitation. The prepared audio preserves pitch at 0.85 tempo, normalizes voice levels and adds a short lead-in and four seconds after each invitation. Short timed cues have no added tail and are checked against their phase duration.

The round audio button starts or mutes the voice and quiet background. Next replaces the voice while preserving the ambience. Pause/resume preserves the playback position; leaving releases every track and hiding the page pauses it. Natural breathing has three independent moments and remains unpaced. Timed breathing freezes its clock during the introduction, then follows its existing timings with optional, skippable holds. There is no automatic step advance or speech synthesis fallback.

Backgrounds are decoded once into Web Audio buffers, with a 2.5-second equal-power overlap between tail and head. A single looping buffer runs on the audio clock across moments and after narration ends; it does not restart an MP3 player at each boundary. Pause/resume preserves the background position, while short gain ramps soften explicit starts and stops. At most two decoded backgrounds are cached in memory.

Nine softly processed backgrounds vary with the experience: birds, stream, wind, rain, ocean waves, summer night, fireplace, wind chimes and singing bowl. The second mindful-listening moment stops the background to leave room for the listener’s own music. Sources, licences and processing details are retained in `dist/audio/nature/credits.json`; the About page links to the attribution text. Rain and waves require CC BY attribution; the other recordings are CC0/public domain. Original downloads, reproducible scripts, per-moment reports and 68 mixed listening previews are in `voiceover/full/`. Serving the app never calls ElevenLabs and exposes no API key. All 68 voice files and nine backgrounds are included in the explicit offline download. `voiceover/all-experiences-audio.zip` contains the individual mixed MP3s, corresponding narration scripts and credits.

Every practice shares one control size, 24 px icons and 12 px spacing. Audio remains light blue, pause light grey, previous and Next/Finish in the same near-white shade. Previous fills the navigation pill's height without an inset border. Next and Finish use the same right-aligned label and arrow, including the three breathing modes. The shared control size reduces together on compact screens.


## Loading performance

Home, Community and the journey load only their core modules. The practice renderer, catalogue illustrations, breathing controller and audio controller are imported on demand for the catalogue, a practice or a completion page. Direct practice links show a short loading state with a recoverable error instead of a blank screen. Leaving before a download finishes never reopens the old route. Voice and nature files still require the audio button; they are not part of initial page loading.

Core module preloads avoid a dependency-discovery round trip. The logo is sized for up to 3× its displayed width. Offline registration waits until page load and idle time; status checks do not repaint an active practice. Explicit offline downloads use at most four concurrent requests and write each response immediately, without retaining the entire 21 MB audio package in memory.

The local Python preview now compresses HTML, CSS, JavaScript and SVG with gzip when supported and revalidates cached public responses with ETags. Its compression cache is bounded and changes invalidate the entry. Restart an already running preview to use the new server handler. Hosted compression and cache headers remain the hosting platform’s responsibility. No personal form or journey data is added to HTTP caching.

The initial Home dependency and image payload fell from 263,153 to 198,638 bytes before compression (about 25%); the compressed equivalent is about 79 KB with this preview server. These are file-size measurements, not browser timing claims. `npm test` includes startup navigation/error regressions, bounded offline-download tests, and socket-free Python tests of compression and cache revalidation.
