# MathHero 1.2 physical iPhone and iPad acceptance

Status — **acceptance complete** for MathHero 1.2, confirmed by the user on
17 November 2026 (Europe/Paris).

## Recorded device acceptance

The user reported updating the app and checking the new column arithmetic
module on both iPhone and iPad. Both worked, no issues were reported, and the
user explicitly requested closure of MathHero 1.2 acceptance.

| Device | Result | Evidence |
| --- | --- | --- |
| iPhone | Passed — user reported | User confirmed that the new module worked after updating the app. |
| iPad | Passed — user reported | User confirmed that the new module worked after updating the app. |

This closes the physical-device acceptance gate for the published 1.2.0
release, tagged `v1.2.0` at `f992f04372481c422a46e62d45b98dc608d84ac3`.
Exact models, OS versions, separate Safari/Home Screen results and startup
measurements were not supplied. This overall user sign-off is distinct from
automated Chromium/WebKit checks and does not assert individual execution
of every extended case below.

See the [1.2 delivery record](DELIVERY-COLUMN-ARITHMETIC.md#physical-device-sign-off)
for release closure. The [1.1 device sign-off](DEVICE-ACCEPTANCE.md) remains
historical evidence for the earlier multiplication release.

## Extended regression reference

Retain these procedures for future checks. Individual case results were not
provided with the overall 1.2 acceptance.

Use Safari and the Home Screen installation at
[the MathHero Pages URL](https://dmitrygaravsky.github.io/MathHero/), where
1.2.0 was published on 17 November 2026. Record the iPhone and iPad models,
OS versions, installation mode and observed results. Export important history before any restore or
storage reset. Use a disposable profile or installation for backup tests.

| Check | Expected on each device | iPhone | iPad |
| --- | --- | --- | --- |
| Home and navigation | The counters and notebook cards are distinct and tappable. Multiplication and both column operations open within two actions. Check portrait and landscape. | Not individually reported | Not individually reported |
| Languages and appearance | Try Spanish and Russian and the System, Light and Dark themes. Switch back from parent mode. Navigation, digits, marks, focus and help remain readable without horizontal scrolling. | Not individually reported | Not individually reported |
| Addition | Start a three-digit addition. Enter digits from units leftward, select and replace a digit, erase, and toggle a carry one above the thousands cell. Check a correct answer and watch the short confirmation advance. | Not individually reported | Not individually reported |
| Subtraction | Start a three-digit subtraction. Toggle dots above lending digits. When a borrow through zero appears, dot the zero and check the answer. Use the on-screen controls in both orientations. | Not individually reported | Not individually reported |
| Error and help | Check an incorrect answer. The first place to revisit is clear and the draft remains visible. Open the worked help, close it, and explicitly correct the answer. | Not individually reported | Not individually reported |
| Separate drafts | Save a marked addition and subtraction with digits and a selected place. Switch between operations and enter and leave parent mode. Return to each saved draft and confirm the same exercise, digits and marks. | Not individually reported | Not individually reported |
| Timing and feedback | Background or pause during feedback and reopen. Resume explicitly. Confirm incorrect feedback waits and that saved correct feedback can continue with Next. | Not individually reported | Not individually reported |
| Parent view | Use the local PIN. Switch between modules and between addition and subtraction, then read the percentages and expand a session. Check that help and notes are visible in history. | Not individually reported | Not individually reported |
| Offline launch | Wait for offline readiness in the Home Screen installation. Save both marked drafts, close the app, enable airplane mode and reopen. Resume both drafts and complete a check while offline. | Not individually reported | Not individually reported |
| Upgrade from 1.1 | On an existing 1.1 installation, save a multiplication draft before updating. Keep two clients open while the update prepares, then close every MathHero tab and Home Screen window. Reopen, check preferences, PIN, history and rewards, and confirm the saved multiplication question and entry resume. | Not individually reported | Not individually reported |
| Backup | Export 1.2 from Settings and Data. Restore it to a disposable destination and verify both modules' history and drafts. If a 1.1 export is available, verify that restoring it keeps the destination's column sessions. | Not individually reported | Not individually reported |

For future regression checks, record failed or unavailable cases and how far
each check got. Share observed results with the coordinator. Browser emulation
and desktop loopback timings remain separate evidence from the user sign-off.
