# Mastery, delayed retention and rewards

Multiplication policy reference for MathHero 1.2. The mastery and reward rules
carry forward from the published MVP. Retained is additional parent evidence.

## Mastery and review intervals

Confirmed mastery requires a qualifying correct practice answer. Within the
most recent 20 attempts for the pair, it requires at least five successes
over at least three session-local calendar days and two separate practice
sessions, at least 95% accuracy and a median of at most 3,000 ms over the
latest 15 correct answers. Each orientation needs at least one fast correct
answer and a correct latest attempt. There must be no error in the last five
attempts or within the previous seven elapsed days. A later answer can remove
current mastery. An earned achievement remains in the ledger.

Fast recall grows the schedule through **1, 3, 7, 14 and 30 elapsed days**
of 24 hours each. A second consecutive correct answer that is fast establishes
the one-day interval. Later increases require a fast correct retrieval when
due and a different local day from the last interval increase. Fast practice
before the due time preserves it. An error resets the interval and makes the
pair due immediately. A slow correct response caps review at one day and can
bring the due date forward. A correct answer before establishing an interval
still schedules next-day review.

## Delayed retention

A Retained check requires a fast correct practice answer with mastery before
and after it. The response must reach the nominal due time **and** follow the
last recorded practice attempt by at least the full scheduled interval. It
must occur in a different session and on a different calendar day from the
last attempt, and on a different day from the interval-setting answer.
Comparisons use the recorded session zones and also check that the last and
current timestamps fall on different dates in the checking session's zone.

A rehearsal close to the nominal due date can still allow the schedule to move
forward on the next fast answer. The additional elapsed-gap rule prevents that
answer from establishing delayed retention. The app displays the interval and
date of the qualifying check. A wrong or slow response, or loss of mastery,
invalidates this proof. Fast early practice can preserve an existing proof.

## Rewards and achievements

| Practice event | Stars | Awarded once per |
| --- | ---: | --- |
| Correct answer, including a slow correct answer | 1 | Attempt |
| Every fifth consecutive correct answer in a session | 1 | Qualifying attempt |
| Finish a session with at least one recorded answer, including early finish | 2 | Session |
| First confirmed mastery | 3 | Canonical pair |
| Successful scheduled review | 5 | Canonical pair and previous due timestamp |

The five-star award uses the published rules. The pair must be mastered before
and after the fast correct answer, the previous due time must have arrived,
and its last practice attempt must fall on a different day in the current
session's zone. The reward can therefore be earned when the newer Retained
evidence still lacks the full elapsed gap.

Achievements mark 10 correct practice answers, 25, 50 and 100 mastered
directions, seven distinct days with practice answers, and mastery of all 144
directions. They add no stars. The seven days can be nonconsecutive. Diagnosis
earns no learning mastery, stars or achievements.
