---
name: oss-skill
description: "Fix the structure and packaging of a repository that ships agent skills, so every skill loads in every host that reads the Agent Skills format. Covers the top-level skills directory layout, SKILL.md frontmatter conformance, splitting an oversized skill into references, and the license field an extracted skill carries with it. Use when a skill fails to load or never triggers, when a repository keeps its skills somewhere an installer does not read, when a SKILL.md has grown too long to load cheaply, or when auditing a repository whose product is agent skills. What a skill teaches and how its sentences read is out of scope: prose belongs to oss-writing, README structure belongs to oss-readme."
license: MIT
---

# Structure of a repository that ships agent skills

Fix the four things that decide whether a skill loads at all: where it sits, whether its frontmatter conforms to the Agent Skills specification, how much context its body spends, and whether a copy of it carries its license. A skill that fails any of these is invisible or unusable no matter how good its instructions are.

Most of what this skill fixes is mechanical, and a specification validator names the fault precisely. Run the validator before reading further into any repository; its output tells you which of the rules below is in play.

## Scope

The SKL rules belong here: R-SKL-01 layout, R-SKL-02 specification conformance, R-SKL-03 body size, and R-SKL-04 the license field.

Neighbouring work belongs elsewhere. Wiring the validator into CI is R-CI-02, owned by `oss-ci`, because the rule already requires CI to run the same linter the contributing guide gives to humans, and for a skills repository that linter is the validator. Keeping every host manifest on one version is R-CHG-03, owned by `oss-changelog`. The README's install command and runnable example are R-DOC-02, and its links to the license, changelog, and contributing guide are R-DOC-03, both owned by `oss-readme`. The sentences inside any file are R-DOC-05, owned by `oss-writing`. Note what a repository needs and hand it to the owning skill rather than doing that work from here.

This skill holds no opinion about what a skill should teach, how prescriptive its instructions should be, or how its description should be tuned to trigger. Those are authoring judgments and `STANDARD.md` states none of them, so neither does this skill.

## Step 1: Find every skill in the repository

Locate every `SKILL.md` in the repository. Resolve symlinked directories to their target first: a repository may commit `.claude/skills` and `.agents/skills` as symlinks pointing at one real `skills/` directory, and a search that follows them reports every skill two or three times.

Sort what you find into three cases. A `SKILL.md` that is a direct child of a top-level `skills/<name>/` satisfies R-SKL-01. A `SKILL.md` reached only through a symlink to that directory is the same file and not a finding. A `SKILL.md` anywhere else is a real finding.

Fix a real finding by moving the whole skill directory under `skills/`, keeping its `references/` and `assets/` subdirectories with it, and by pointing every host manifest that names a skills path at `skills/`. Read [references/hosts.md](references/hosts.md) for which manifest each host reads. Moving the directory without updating the manifests trades one loading failure for another.

Where a repository ships skills only as a plugin and keeps them under a nested plugin directory, say so plainly rather than moving them: that layout loads in the plugin host and fails the `skills` CLI installer, and choosing between them is the maintainer's call, not yours.

## Step 2: Validate against the specification (R-SKL-02)

Run the validator over every directory under `skills/` and fix what it names. The faults it reports come in a small set.

A name and directory mismatch means the frontmatter `name` and the directory name differ. The specification requires them to match exactly. Decide which one is correct by looking at what already references the skill: a name in the README table, in a plugin manifest, or in another skill's prose is a name people already use. Rename the other one.

An invalid name means the value breaks the character rules: 1 to 64 characters, lowercase letters, digits, and hyphens only, no leading or trailing hyphen, no consecutive hyphens. Rewrite it and rename the directory to match.

An over-long description means the field exceeds 1024 characters. Cut the parts a reader already knows, keeping both halves the field must carry: what the skill does, and when to use it. Cutting the when half to fit the limit produces a skill that validates and never triggers.

A missing required field means `name` or `description` is absent or empty. Both are required and neither has a default.

Frontmatter that fails to parse usually means an unquoted description containing a colon, or an angle bracket. Quote the description.

## Step 3: Bring an oversized body under the ceiling (R-SKL-03)

Count the lines of each `SKILL.md`. Where one exceeds 500, the fix is to move material into that skill's own `references/` directory, not to compress the prose until it fits.

Decide what moves by asking what the reader needs on every run against what they need only sometimes. The procedure, the decisions, and the facts that defy assumption stay in `SKILL.md`. Long tables, per-platform detail, worked examples, and anything consulted only in one branch of the work move out.

Name each reference file from `SKILL.md` at the point the reader would need it, and say what makes it worth opening. A pointer at the top of the file listing every reference at once loads nothing usefully, because the reader has no way to tell which one this task needs.

Keep references one level deep. A reference file that sends the reader to a third file costs two loads before the first useful sentence.

## Step 4: Declare the license in every skill (R-SKL-04)

Add a `license:` line to the frontmatter of every `SKILL.md`, naming the same license as the repository license file. Where the two disagree, stop and ask which is correct rather than picking one.

This matters because of how skills travel. An installer that fetches one skill copies that directory and nothing else, so the repository's `LICENSE` file stays behind and the copy arrives with no terms. The specification defines the field to solve exactly this, and it accepts either a license name or a reference to a bundled license file.

## Renaming a skill breaks installs

A skill's name is its identity everywhere downstream: in an installer command, in a plugin manifest, in a user's local configuration, and in any other skill that names it. Renaming one to satisfy R-SKL-02 is correct and is also a breaking change for anyone who installed it.

Treat it as one. Say so when proposing the rename, and hand the changelog entry and the version decision to `oss-changelog` rather than deciding the bump here.

## Report what you changed

List every skill you touched, the rule each change satisfies, and every fault the validator reported that you did not fix, with the reason. Name the rename separately from the mechanical fixes, since it is the only one with downstream cost.
