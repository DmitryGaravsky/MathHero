# MathHero 1.1 physical iPhone and iPad acceptance

Status — active instructions. Physical-device results are **pending**. Run
on real hardware after the coordinator confirms the 1.1 HTTPS deployment.
Automated WebKit, viewport emulation and desktop timing are separate evidence.

Use [MathHero](https://dmitrygaravsky.github.io/MathHero/). Before testing with
valuable history, download a backup. Record device model, iOS/iPadOS version,
Safari version, date, deployed commit, mode (Safari or Home Screen), orientation,
network and pass/fail notes. Repeat on **both iPhone and iPad**, in Safari and from
the Home Screen. Record separate storage/history behavior in each mode.

| Check | Procedure and expected result | Result / notes |
| --- | --- | --- |
| Launch and install | Open HTTPS online. Enter Parent mode → Settings and Data and wait for offline readiness. Use Share → Add to Home Screen. The fox icon and Math Hero name appear. Launch from the icon and check offline readiness there too. | Not run |
| Modes and PIN | Verify Child mode opens by default and practice starts or resumes within two actions. Enter Parent mode with the default PIN on a fresh install. Change it in Settings and Data, return to child mode in one action, then reset it from the entry dialog. Confirm the default PIN works and the child screen and saved practice remain available. | Not run |
| Layout | Rotate portrait/landscape on home, practice, map, results and settings. Safe areas clear the notch/home indicator; text and buttons remain readable, no horizontal page scroll or covered keypad. | Not run |
| Themes and glossary | Check System while changing device appearance. Select Light and Dark explicitly, rotate and relaunch, and check that the selection persists. In Settings and Data, expand the glossary and check the Spanish terms and Russian meanings. | Not run |
| Keyboards | Answer with the custom keypad, delete and confirm. Switch to the real system numeric keyboard, dismiss/reopen it, rotate, then return to the custom keypad. If available, test a hardware keyboard. No zoom, duplicate input, hidden answer or blocked confirm. | Not run |
| Complete learning flows | Complete all six diagnostic parts (144 directions), then a daily practice and targeted/difficult practice. Inspect child results, parent analytics, map and stars. Diagnosis itself gives no mastery/stars; one session does not grant stable mastery. | Not run |
| Feedback and pause | Watch a correct answer advance after brief feedback. A wrong answer shows its explanation and waits for Next or optional correction. During correct feedback, immediately open the parent prompt or background/lock the app. On return, verify feedback waits for deliberate continuation. Pause a partially typed answer for 30 seconds and repeat by switching apps. Verify the draft remains and recorded response time excludes pause, hidden time and feedback. | Not run |
| Persistence/restart | Save answers and a draft; pause, close and restart Safari/Home Screen app. Resume the same question with draft, history and preferences preserved. Also record what happens after force-closing the process; a not-yet-committed change is a distinct limitation. | Not run |
| Backup/restore | Export to Files. Change a preference and save an answer, then choose the backup and cancel. Check the current data remains. Confirm replacement on the next import and check the original history, preferences and draft return once. Verify the destination PIN still works. Try a damaged file and check that the app rejects it and keeps the current data. If you have an MVP v1 export, import it in a disposable context and check its history and draft. | Not run |
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
The coordinator records physical-device results in the
[1.1 delivery record](DELIVERY-1.1.md) after review.
