Say what was wrong, what changed, and the tradeoff it makes. Use no headings and no hard wrapping: this text becomes the squash commit message, and one paragraph per line renders correctly both in the pull request and in `git log`.

For a skill change, name the run that went wrong, the harness and model it ran under, and what a model does differently now.

Say how this was verified, beyond the checks CI runs.

On the `Affects:` line below, list the rule IDs and the skills this touches, or write none. Add `Closes #123` beside it when this closes an issue, and a `BREAKING CHANGE:` footer when a skill or a rule ID is renamed or removed, or a rule's requirement tightens. Below 1.0.0 that ships in a MINOR release, as the README's Versioning section says.

Affects:
