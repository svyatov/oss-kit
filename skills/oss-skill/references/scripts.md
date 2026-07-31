# Writing a script a skill ships

Read this when a skill ships a `scripts/` directory, or when the work is about to add one. R-SKL-05 decides what a shipped script may be written in. This file decides how it is written once that is settled. The worked example throughout is the validator this skill ships at `scripts/validate.mjs`, which follows all of it and can be opened beside this file.

## Solve, do not defer

A script handles the failures it can foresee rather than stopping and leaving the agent to work out what happened. Decide, for each one, whether the run can continue with a finding recorded or genuinely has to end.

`validate.mjs` meets a file it cannot read and records `could not read this file` as a warning against that path, then carries on through the rest of the repository. A reader gets every other finding in the same run. A script that threw on the first unreadable file would cost them one run per bad file, and each run would report one fault.

## Every constant carries its reason

A configuration value with nothing beside it is one nobody can change safely later, because the next reader cannot tell what it was chosen against. Write the reason, not the value's history.

`validate.mjs` keeps `node:sqlite` in its list of built-in modules with a comment naming the release that dropped the flag it needed, so a reader can see the floor it was written against. Its name pattern carries three lines saying that the charset admits no `<` or `>`, and that loosening it drops a constraint the description branch tests separately. That comment is what stops a later edit from removing a check nobody knew was there.

## An error message names what was expected

Compare `invalid license` with what the validator prints:

```text
error R-SKL-04 skills/oss-demo/SKILL.md: license "MIT-0" does not appear in the repository license file; confirm both name the same license
```

The second names the value it read, what it compared that value against, and the next action. A message naming only the rule sends the reader to the rule to find out what to do, which is the work the message existed to save.

## Say whether to run the script or read it

Every pointer to a script states which one it is. "Run `scripts/validate.mjs` over the repository" is an instruction to execute. "See `scripts/validate.mjs` for how the frontmatter reader handles a block scalar" is an instruction to read. A pointer that says neither gets read when it should have run, which spends the file's whole length on context.

Prefer execution for a utility script. The reason to bundle one at all is that running it beats deriving the same result again, and a script read as reference has to earn its lines against prose that could have said the same thing shorter.

## Name the runtime floor and every external command

The general practice for a bundled script is to list the packages it needs and confirm they are available in the target runtime. R-SKL-05 permits a shipped script no third-party package at all, so that practice does not transfer unchanged. What there is to state instead is the runtime version the script needs and every external command it invokes. A tool assumed present and missing fails exactly as an uninstalled package does, and it fails on the reader's machine rather than on the author's.

Read that list off the script rather than from memory. The whole point of the practice is that a reader can open the file and check the claim.

`validate.mjs` names Node 22 or later in its header comment, imports `node:fs`, `node:path`, and `node:url`, and shells out to nothing, so its only precondition is the runtime. A shell script states the same thing as the commands it calls: this repository's own `scripts/check-drift.sh` needs `grep`, `awk`, `tr`, and `sort`.

## Print a path the reader can paste

Print forward slashes on every platform. A path built with `node:path` comes back with backslashes on Windows, and a reader who pastes one into a shell or a URL gets a failure that has nothing to do with what the script found.

`validate.mjs` builds its paths with `relative()` and normalizes them once, at the line that prints a finding. One normalization covers every finding whatever built it, including the two that carry a literal separator.
