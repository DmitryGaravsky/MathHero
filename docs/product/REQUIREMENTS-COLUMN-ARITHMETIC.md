# Column arithmetic requirements

Status — implemented and published in MathHero 1.2.0. The user accepted the
exercise mockup and illustrated module cards before implementation. See the
[delivery record](../DELIVERY-COLUMN-ARITHMETIC.md) for software acceptance;
physical iPhone/iPad checks remain pending.

The child already understands regrouping and needs practice to make calculation
more automatic. Each operation starts with two three-digit operands in the
first session. The child can write the same carry and borrow marks used on
paper and can resume an unfinished example with those marks intact.

## Entry points and visual design

- The child home presents **Multiplication table** and **Column arithmetic**
  as peer destinations. Give each card a large, colorful illustration and a
  visible label. Show equal rows of counters with a multiplication sign for
  the table, and a squared notebook with a vertical example and a pencil for
  column arithmetic. The illustrations have distinct silhouettes in both
  themes. The whole card is a touch target. Show a resume action where a
  saved session is available.
- The multiplication card opens the established practice flow. The column
  card offers **Addition** and **Subtraction**. Selecting an operation
  starts or resumes practice. An exercise is at most two actions from the
  child home in either module.
- The multiplication exercise uses a horizontal equation and a single answer
  field. The column exercise uses right-aligned operands, a row of handwritten
  notation, a rule and a digit cell for each answer place. A visible outline
  and an accessible label identify the active place. The layout also reserves
  a thousands place for addition.
- Both modules share the existing app shell, styles, light/dark/system
  preferences, numeric keypad and controls for pausing and exiting. Localize
  all labels and explanations into Spanish and Russian. Spanish remains the
  default language.
- Parent mode provides separate multiplication and column arithmetic views
  under the existing PIN gate. Column results distinguish addition from
  subtraction and summarize first-check accuracy, independent solutions,
  repeated difficulties and active time on comparable exercises.

## Practice behavior

- Generate exercises with two operands between 100 and 999. Start with
  independent practice and vary where and how often regrouping occurs.
  Include chained carries, borrowing across a zero, zeros in the answer and
  a possible four-digit sum. Subtraction results are nonnegative.
- Start answer entry at the units place. Move left after each digit. Allow
  the child to erase or replace an entered digit, including an explicit zero.
  Accept answers with fewer digits than the available cells. A zero answer
  still requires an explicit zero.
- In addition, tapping an upper cell toggles a small **1** above the
  receiving place, including the empty thousands cell. In subtraction,
  tapping a digit in the top operand toggles a **dot** above the place
  supplying the borrow. Allow several marks and keep them visible as the
  active answer cell moves.
- Manual marks are optional working notes. The check action evaluates the
  numeric answer. A correct first check counts as independent if the app
  has supplied no hint for the example. Distinguish requested hints from
  manual marks and keep the two states independent.
- Give brief positive feedback after a correct check, then advance when
  practice is active. For an incorrect check, identify the first answer
  place to revisit, preserve the draft and let the child choose when to
  correct it or open an explanation.
- Use short sessions. Revisit recurring difficulties with fresh operands and
  schedule checks on later days. Track accuracy and active time separately.
  Keep the timer out of the exercise view and exclude feedback, pause and
  hidden time from it. Exact session length and review intervals are pilot
  parameters.

## Resume and data compatibility

- Save the current exercise, answer digits, manual marks, active place,
  help already shown and current phase together. After an explicit pause or
  save-and-exit has completed, resume in the same state. Reopening the PWA
  restores the latest committed draft. Switching actions or modes preserves
  the saved session for each operation.
- Keep the multiplication route and data model compatible with MathHero 1.1.
  Give column sessions and skill evidence their own records and keep progress
  and rewards for multiplication independent. Stale tabs must be unable to
  overwrite a resumed or restored session.
- Define an additive database upgrade and a versioned backup format before
  shipping. Preserve MathHero 1.1 history, rewards, settings and unfinished
  multiplication. Import existing backup formats and validate new records
  and replayed evidence before an atomic restore. Keep the device PIN local.
- The new module works offline through the existing PWA. Its regular child
  flow, complete with resume, must work on iPhone and iPad.

## Acceptance examples

| Case | Expected behavior |
| --- | --- |
| Child home | The illustrated multiplication and column cards remain distinguishable in light and dark themes. Each full card can be activated by touch or keyboard. An exercise opens within two actions from the child home. |
| First session in each operation | The first exercise has two three-digit operands and starts with empty answer cells and no automatic hint. |
| `586 + 647` | The child can toggle carry marks above tens, hundreds and the blank thousands place, then enter `3`, `3`, `2`, `1` and check `1233`. |
| `604 − 187` | The child can toggle dots above `6` and `0`, then enter `7`, `1`, `4` and check `417`. |
| Pause and resume | After saving `233` and three carry marks in the first example, resume at thousands. After saving `17` and two dots in the second, resume at hundreds. Repeat after mode switch and after reopening offline. |
| Other answer lengths | `199 + 205` accepts `404` with an empty thousands cell. `501 − 492` accepts `9`. `304 − 304` requires a `0`. |
| Feedback and evidence | Manual notes alone leave an answer eligible for independent credit. A shown hint stays recorded after closing the hint and resuming. Paused or hidden feedback does not advance. |
| Upgrade and restore | Use a database created by the published 1.1 build. Preserve its multiplication draft, settings, evidence and rewards after upgrade. Verify old and new backup imports and atomic rejection of invalid input. |
| Device and locale coverage | Verify navigation, touch targets, keypad, active place and resume in ES/RU and light/dark/system on iPhone and iPad. Record physical checks separately from browser emulation. |
