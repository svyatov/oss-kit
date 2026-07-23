# Adoption guide

The bar is the same for every repository. What changes is the order you reach
it in, and how much of it you fix at once.

## A new repository

Set the whole bar up front, while there is nothing to break and no history to
be careful with. Run oss-audit on the empty repository, and let it route you:
community files and a license first, because contributions and use are
blocked without them, then the README, then CI, then hardening, then the
release path when you are ready to publish something.

Nothing here needs staging. A repository with no users has no migration.

## An established repository

Run the audit and expect a long list. That is normal, and it is not a to-do
list you work through in one sitting.

Fix in the order the audit gives you rather than the order that looks urgent.
The order is not a severity ranking: it puts rules that block other rules
first, because a missing license blocks the community rules that assume the
project can legally be used, and a missing contributing guide blocks the CI
rule that checks its commands still work. Fixing a blocked rule first means
fixing it twice.

Do one area per change. A pull request that rewrites the README, adds four
community files, and rewires CI cannot be reviewed, and it cannot be reverted
in pieces when one part turns out wrong.

Take the unknowns seriously. The audit reports a rule as unknown when a
checkout cannot answer it, such as a forge setting or a signing key it cannot
reach. An unknown is not a pass. Close it by giving the audit the access it
needs, or by checking the setting yourself.

## What to skip

A rule that does not reach your repository is not a failure. The audit marks a
rule not applicable when it is scoped to the other forge, or when it rests on
something you do not have, such as a package registry or a release tag. Record
the ones you are deliberately not fixing, with the reason, where the next
person will read it.
