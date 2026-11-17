# Release notes

User-facing changes in published MathHero releases. Implementation reviews,
test runs and stage history remain in the linked delivery records.

## 1.2.0 — 2026-11-17

### Column addition and subtraction

- Choose multiplication or column arithmetic from the illustrated home.
  An exercise is at most two actions away.
- Practice with two three-digit operands from the first session. Column
  sessions contain six examples and revisit carry and borrow patterns.
- Enter digits from units leftward, select or erase a digit, and add optional
  carry ones or borrow dots. Manual notes do not count as app-provided help.
- Correct answers advance after brief feedback. Incorrect answers keep the
  draft and highlight the first place to revisit; worked help is optional.
- Resume separate addition and subtraction drafts with their digits, marks,
  selected place and prior help preserved, including after an offline restart.
- Read separate parent reports for each operation: first-check accuracy,
  independent solutions, corrections, help, unfinished examples and history.
  Timing describes comparable examples; multiplication rewards remain separate.

### Existing data and backups

Updating an existing installation preserves multiplication history, rewards,
preferences, the local parent PIN and unfinished practice. New v3 backups
cover both modules. Restoring a legacy v1/v2 backup replaces multiplication
and shared preferences while preserving column data. The destination's PIN
stays local. See [backup and restore](docs/user/DATA_AND_BACKUP.md).

### Updating an installed app

Open MathHero online and wait for Settings and Data to report a ready update.
Save practice, close every MathHero tab and Home Screen window, then reopen
from the same icon. There is no App Store update to install. Follow the
[iPhone update instructions](docs/user/SETTINGS.md#apply-an-update); do not
delete the app or clear website data to refresh it.

### Verification

The published release passed 103 unit tests, 306 browser checks, 10 PWA checks
and 12 native upgrade checks, plus public HTTPS and offline checks in Chromium
and WebKit. Six existing duplicate diagnosis cases were intentionally skipped.
Physical 1.2 iPhone/iPad acceptance remains pending. See the
[delivery record](docs/DELIVERY-COLUMN-ARITHMETIC.md) and
[device checklist](docs/DEVICE-ACCEPTANCE-1.2.md).

## Earlier releases

The [1.1 delivery record](docs/DELIVERY-1.1.md) and
[original MVP delivery record](docs/DELIVERY.md) preserve earlier changes and
acceptance evidence.
