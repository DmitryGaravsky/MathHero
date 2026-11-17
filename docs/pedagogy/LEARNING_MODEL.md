# Learning model

Status — active description of the multiplication learning model. See the
[column arithmetic guide](COLUMN_ARITHMETIC.md) for addition and subtraction.

The catalog covers 144 directed facts for factors 1–12. For example, 7 × 8
and 8 × 7 have separate answer histories and share one canonical pair. There
are 78 pairs, including the 12 squares. [Diagnosis](DIAGNOSTICS.md) supplies
baseline evidence. Practice supplies learning evidence, with separate measures
for accuracy and speed. Speed statistics use correct answers.

The parent overview counts canonical pairs. A Retained pair contributes to
all three counts, and a Fluent pair also counts as Learned. Pair details show the
strongest currently supported level. The map describes the selected direction
and also shows this shared pair evidence. Its fast-practice marker requires
repeated fast correct answers in that direction. Its star marks established
[mastery](MASTERY_POLICY.md).

| State | Evidence in the latest 20 practice attempts for the pair |
| --- | --- |
| Learned | At least two correct answers, at least 80% accuracy and a correct latest answer in each orientation. |
| Fluent | Learned evidence, at least 90% accuracy, and at least three fast correct answers across at least two sessions. At least 80% of correct answers are fast, including the latest answer in each orientation. |
| Retained | Fluent evidence, current mastery and a qualifying [delayed retrieval](MASTERY_POLICY.md#delayed-retention). |
| Unconfirmed | The available practice evidence falls short of Learned. |

The saved session policy defines a fast response as at most 3,000 ms in the
registered policies. These thresholds are pilot parameters for the app.
Interpret them as observations of practice. They have no validated educational
norms or diagnostic meaning.

## Reading weak spots

Weak Spots counts errors and correct-but-slow answers separately across up to
ten recent practice attempts per pair, with a labeled diagnosis-only fallback.
Rows with recurring errors rank first, followed by incorrect and slow counts.
Use the pair detail to see the evidence before starting weak or targeted practice.

- **Recurring errors** require two or more wrong answers across distinct
  sessions and dates.
- **Instability after mastery** requires at least two wrong or correct-but-slow
  answers across distinct sessions and dates after prior confirmed mastery.
  Renewed mastery or a verified delayed check restarts setback tracking.
- **Possible input slip** requires one reversal of a two-digit product bracketed
  by fast correct answers in the same orientation, across three distinct
  sessions and dates. The original attempt still counts as incorrect for
  accuracy, scheduling and rewards.
