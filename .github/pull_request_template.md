<!--
Delete any heading below that this change has nothing to put under.
Keep `Closes` and any `BREAKING CHANGE:` footer last, so they still parse
when this description becomes the squash commit body.
-->

## What changed

<!--
What is wrong now, and what this does about it. Give a change with separable
parts one bullet each, so a reviewer can pick where to start.
Changing a skill: name the run that went wrong, and the harness and model it
ran under.
-->

## Why this way

<!--
The constraint that forced the choice, or the alternative rejected and why.
Skip it where the diff already answers the question.
Changing a skill: what a model does differently now.
-->

## Verification

<!-- What you checked beyond the checks CI runs. -->

## Known gaps

<!-- What this leaves unfinished on purpose, and what would close it. -->

## Affects

<!--
One row per rule ID or skill this touches, and what happened to it. Delete the
section where the change touches neither.

| Rule or skill | Change |
| --- | --- |
| R-DOC-05 | wording only, requirement unchanged |
| oss-writing | change-request guidance added |
-->

<!--
Add a `BREAKING CHANGE:` footer below when a skill or a rule ID is renamed or
removed, or a rule's requirement tightens. Below 1.0.0 that ships in a MINOR
release, as the README's Versioning section says.
-->

Closes #
