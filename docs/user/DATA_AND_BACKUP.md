# Data and backup

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

Opening 1.2 in the same browser and storage container automatically updates
the local database. Existing multiplication history, preferences, awards,
saved practice and the custom PIN carry forward. Use `v3` exports to transfer
the new column sessions to another installation of 1.2.

Your custom parent PIN stays on the destination device. Backups contain
learning history and preferences, so store them as private files. MathHero
collects no child name or account identifier.

Wait for Pause or Save and exit to finish before closing. In column practice
this saves your answer digits, marks, selected place, help already requested
and feedback together. An abrupt exit can interrupt a pending save. If two
windows open the same practice, the most recent explicit Resume takes control.
