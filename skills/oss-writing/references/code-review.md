# Code review comments and replies

A review comment names the concrete defect, states its consequence, and gives the required outcome, in about two sentences. Say whether it blocks or is optional, and use a suggestion block when the exact edit is known.

## Core rules

- Follow the convention the repository declares.
- Comment on the code, not the person.
- Explain your reasoning. State the problem, then give the fix only when you know the exact edit. Otherwise leave the choice to the author.
- As author: do not reply in anger. If you do not understand, ask. If you disagree, state tradeoffs and collaborate.

## If the repository adopted Conventional Comments

- Prefix each comment with a label: praise, nitpick, suggestion, issue, todo, question, thought, chore, note.
- Add a decoration when it helps: (blocking), (non-blocking), (if-minor).
- Format: `label (decoration): subject`. Add a discussion line for the why and the next step.
- Pair an `issue` with a `suggestion` when you know the exact edit.
- Leave at least one `praise` per review when one is honest.

### Worked review exchange

```
Reviewer:
issue (blocking): This query runs inside the request loop.

It sends one round trip per row, so a 500-row page makes 500 calls.

suggestion: Batch the ids and run one query.

Author:
Fixed. Batched into a single query. Latency on the 500-row page dropped from 1.9s to 40ms.
```
