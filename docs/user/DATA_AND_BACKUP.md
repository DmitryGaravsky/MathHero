# Data and backup

Status — instructions for the column arithmetic release.

MathHero saves answers, progress, preferences, achievements and unfinished
sessions in IndexedDB. Each browser profile and site origin has its own data.
Safari and its Home Screen app can also use different storage containers.
Clearing website data, private browsing, storage eviction or device loss
can remove local history. Save copies outside the browser.

## Export or restore

1. Open **Parent mode → Settings and Data** and export a JSON backup. On
   iPhone or iPad, save the file somewhere you can find again in Files.
2. In the destination app, choose the backup file. MathHero validates it
   before showing the replacement confirmation.
3. Check which data the confirmation says will be replaced. Export the
   destination first if you want to keep a copy of its current history. Cancel
   to keep the current data. A file that fails validation or a failed restore
   leaves it intact.
4. Open the relevant practice and explicitly resume any unfinished session.

- Current exports use backup format v3. Restoring one replaces both
  multiplication and column arithmetic history, all unfinished sessions, and
  preferences.
- Older v1 and v2 backups replace multiplication history, unfinished
  multiplication sessions, and preferences. They preserve column history
  and unfinished addition and subtraction sessions.

Your custom parent PIN stays on the destination device. Backups contain
learning history and preferences, so store them as private files. MathHero
collects no child name or account identifier.

Answers are saved as transactions. Pause before closing if you want to keep
the current draft and active time. An abrupt exit can interrupt an in-flight
draft or preferences save. If two windows open the same practice, the most
recent explicit Resume takes control. Reload the other window before continuing.
