# Physical iPhone and iPad acceptance

Status: **not yet executed**. The user will run this checklist on real hardware
after the coordinator confirms the HTTPS deployment. Automated WebKit, viewport
emulation and desktop timing are separate evidence and do not complete this gate.

Use [Math Hero](https://DmitryGaravsky.github.io/MathHero/). Before testing with
valuable history, download a backup. Record device model, iOS/iPadOS version,
Safari version, date, deployed commit, mode (Safari or Home Screen), orientation,
network and pass/fail notes. Repeat on **both iPhone and iPad**, in Safari and from
the Home Screen. Record separate storage/history behavior in each mode.

| Check | Procedure and expected result | Result / notes |
| --- | --- | --- |
| Launch and install | Open HTTPS online. Wait for Settings to report offline readiness. Use Share → Add to Home Screen. The fox icon and Math Hero name appear; launching uses standalone mode. | Not run |
| Layout | Rotate portrait/landscape on home, practice, map, results and settings. Safe areas clear the notch/home indicator; text and buttons remain readable, no horizontal page scroll or covered keypad. | Not run |
| Keyboards | Answer with the custom keypad, delete and confirm. Switch to the real system numeric keyboard, dismiss/reopen it, rotate, then return to the custom keypad. If available, test a hardware keyboard. No zoom, duplicate input, hidden answer or blocked confirm. | Not run |
| Complete learning flows | Complete all six diagnostic parts (144 directions), then a daily practice and targeted/difficult practice. Inspect child results, parent analytics, map and stars. Diagnosis itself gives no mastery/stars; one session does not grant stable mastery. | Not run |
| Pause/background | Enter a draft, pause for 30 seconds, resume. Repeat by switching apps and locking the screen for at least 30 seconds. Return is paused, draft remains, and the recorded answer excludes the pause/background duration. | Not run |
| Persistence/restart | Save answers and a draft; pause, close and restart Safari/Home Screen app. Resume the same question with draft, history and preferences preserved. Also record what happens after force-closing the process; a not-yet-committed change is a distinct limitation. | Not run |
| Backup/restore | Export to Files; change a preference and save an answer; choose the backup, cancel and verify unchanged data. Import again and confirm replacement: original history/preferences/draft return once. Try a damaged file: reject without replacing data. Transfer a backup between iPhone and iPad if desired. | Not run |
| Languages | Switch RU/ES on all screens, including installation/update guidance, backup dialog and resumed feedback. Restart and verify the selected language. | Not run |
| Airplane mode | After offline readiness, enable airplane mode and ensure Wi-Fi is off. Close/reopen each app mode. Start/resume practice, save an answer, view results/map, switch language, export/import a backup and reload while offline. No network is required for these flows. | Not run |
| Multiple windows | Open two Safari tabs on the app. Explicitly resume the same session in the second tab: the stale first tab must not overwrite its answers. Close tabs after testing. | Not run |
| Update | Coordinate with a later real release. Keep a draft and two app tabs/windows open while the new version downloads. Confirm no forced reload. Pause, close every Math Hero client including Home Screen, reopen and resume the draft. Check history and rewards are retained. Repeat offline after the new release is ready. | Not run |

## Startup measurement

Measure from tapping the link/icon (or initiating a reload) to a fully rendered,
responsive home screen with the practice button usable, using a screen recording
with timestamps if possible. Record at least five samples and report each sample,
median and maximum. Target: **no more than 3 seconds on a normal connection**;
document the actual connection rather than treating “normal” as a measured speed.

Measure separately: first online visit with empty app cache/storage (use a fresh
test context or back up before clearing), repeat online launch, and installed
offline launch in airplane mode. Record network type/speed if known, battery and
Low Power Mode, cold/warm process state, dataset size and competing device load.
Do not combine first-download, warm-cache and offline measurements into one number.
Restore any valuable data after a deliberate storage-clear test.

## Sign-off

Attach observations/screenshots and startup samples to the coordinator. Record
failures with exact reproduction steps; do not mark unexecuted rows as passed.
The coordinator records physical-device results and the remaining MVP gate in
`docs/DELIVERY.md` after review.
