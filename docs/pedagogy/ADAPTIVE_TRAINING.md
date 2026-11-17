# Adaptive and targeted practice

Multiplication selection reference for MathHero 1.2.

A standard session contains 24 questions. The first four are the warm-up and
the last four are the challenge. General weak practice favors incorrect and
slow pairs. Targeted practice begins with the selected canonical pair and gives
it more weight in later slots.

New multiplication sessions use registered **policy v2**. When ordinary adaptive practice
starts with mastered pairs due for review, slot one goes to the oldest due
mastered pair. This gives delayed recall a regular opportunity within the
existing session length. A backlog can span sessions. Policy v1, general weak
practice and targeted practice use the original opening rules.

Later selection follows the original weighting. Errors have weight 14, due
reviews 10, slow 8, unchecked 6, developing 3, fluent 1 and mastered before
their due date 0.25. The warm-up favors familiar facts when available.
Weak practice and the challenge increase weights for errors and slow correct
answers. The engine prefers the less-exposed orientation across diagnosis and
practice, with a random draw on ties.

An error can return after two intervening questions. A correct first practice
attempt for a pair queues another retrieval after four intervening questions.
Regular selection avoids the last three pairs,
varies which table appears, and prefers at most two optional mastered checks
while other candidates are eligible. An ordinary 24-question session presents
a pair at most four times, including repeats. Questions left over from the
repeat queue do not add slots. Progress retains the pair's due state for future
practice.

The current question and repeat queue are saved. Resuming uses the saved
question and policy. New selections happen when that session advances.
[Mastery and review intervals](MASTERY_POLICY.md) describe when facts become due.
