# Working out what a report has to collect

R-COM-05 asks that reports arrive with the facts you need. Which facts those are depends on the project, so this file is the method for deriving them and for choosing the field that carries each one. The derivation is forge-independent: the same list of facts becomes typed fields in a GitHub issue form and headings in a GitLab description template.

## The test for a field

A field belongs on the form when two reports could differ in that field alone, and one would reproduce while the other would not. That is what makes it a variable that decides the outcome rather than background about the reporter.

The same test read backwards is what keeps a form short. A field whose answer never changes what you do next is friction, and friction has a cost: every required field is another chance for the reporter to close the tab, and an abandoned form collects nothing at all. Never ask for what you can read yourself either. If the answer is in the reproduction they attach, or the template already prefills the label that would have carried it, the field is doing no work.

## Where the evidence lives

Five sources, ordered by how directly each one names the axes. Work through them before proposing anything.

The CI matrix. Every axis a workflow matrix expands over is an axis the project supports, and therefore an axis a report can differ on. A matrix over three runtime versions and two operating systems is the project's own statement that both change behavior, so a bug template that asks for neither is missing two fields.

The manifest's support declarations: `engines`, `required_ruby_version`, `requires-python`, `rust-version`, a peer dependency range, a minimum host version in a plugin manifest. Each range is a span the project promises to work across, so each is a value a report has to pin down.

The install or getting started documentation. Every host, platform, editor, runtime, or integration the project claims support for is a legitimate answer to where the reporter hit this, which means the field needs an option for each. The option list and the documented set are then the same claim written twice, and they have to be changed together.

Closed issues where a maintainer had to ask a follow-up question before they could act. This is the only empirical source in the list, and it is the strongest: a question the maintainer has asked twice is a field that should already have been on the form. Read the first maintainer comment on a sample of closed defect reports and write down what each one asks for.

The boundary the project sits on. Software that runs inside something else inherits that thing's identity as a variable. A plugin inherits its host and the host's version, a model-driven tool inherits which model ran, a container image inherits its base digest, a driver inherits the kernel. This axis is the one most often absent from a template, for the reason in the next section.

## The field the maintainer has not thought of

A variable that never varies for the maintainer is invisible to the maintainer. They run one host, one model, one distribution, so the axis never appears in their own reproduction and never occurs to them when they write the template. It still decides the outcome for everyone else.

An agent skills project is a clean example. The maintainer works in one harness with one model, so the bug template they write asks for the skill and the version. A report that arrives through it cannot distinguish a skill whose instructions are wrong from a host that loads skills from a different path or a model that read the same instructions differently, which is the first thing triage has to decide. Naming that boundary out loud is the part of this work a maintainer cannot do for themselves, so name it when presenting the slate, and say what a report is unable to tell them without it.

## Which element carries which fact

A closed set the repository controls, such as the components it ships or the platforms it documents, is a `dropdown`. The option list becomes a public claim about supported scope, so it has to match the documentation and be updated alongside it.

A set that changes faster than the repository releases, such as the model names in circulation, is an `input` with examples in the placeholder. A dropdown here is stale between releases, and a stale dropdown pushes reporters into an "other" option that collects nothing.

A version is an `input` whose description names the command that prints it, so the reporter pastes output instead of recalling a number.

Logs, stack traces, transcripts, queries, and configuration go in a `textarea` with `render` set to a language. That formats the answer as a code block and turns off Markdown editing for the field, so nothing arrives mangled by accidental formatting.

Preconditions the reporter has to confirm, such as having searched existing issues or reproduced on a supported version, are `checkboxes` with per-option `required`. Keep the list to the one or two that actually change triage; a wall of attestations reads as a toll on filing a report.

A screenshot or a minimal reproduction repository goes in `upload`, or in a `textarea` whose description says a file can be dragged into the box, where `upload` has not been verified on the repository.

Anything the template can decide for the reporter belongs in the top-level keys rather than in a field. `labels`, `type`, `title`, `assignees`, and `projects` all prefill from the template, so a form asking the reporter to type a label is asking them for work it could have done itself.

## Choosing the categories

Ship one template per kind of work that gets triaged differently. A defect and a proposal land in different parts of a maintainer's week, so they are two templates. A distinction that only sets a label or names a component is a field inside one template instead of a second file, because near-identical templates drift apart the first time one of them is updated.

Questions and support requests are the largest source of tracker noise and the one templates cannot fix, since a question is not a defect whatever shape it is filed in. Route them out of the tracker with `contact_links` in the chooser config, pointing at the discussion forum, chat channel, or mailing list where the project actually answers them. Where a project has nowhere to route them, leave the blank issue enabled rather than closing the only door: R-DOC-08 requires a public channel for questions, and if the tracker is that channel then it has to accept a question that fits no template.

## What this looks like for a project that runs inside a host

An issue form for a repository of agent skills, showing the boundary axis from the fifth source, the dropdown and input decision, and prefill in the top-level keys:

```yaml
name: Bug report
description: A skill did something other than what its SKILL.md says
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        A skill's behavior depends on the harness that loaded it and the model that read it, as much as on the skill's own text. Those two answers decide whether this is a defect in the skill or a difference between hosts.
  - type: dropdown
    id: harness
    attributes:
      label: Harness
      description: Where the skill was loaded. The install guide lists the hosts this project supports.
      options:
        - Claude Code
        - Codex CLI
        - Cursor
        - opencode
        - Other
    validations:
      required: true
  - type: input
    id: harness-version
    attributes:
      label: Harness version
      description: Name the host here as well if you chose Other above.
      placeholder: claude 2.1.217
    validations:
      required: true
  - type: input
    id: model
    attributes:
      label: Model
      description: The exact name, with the revision if you have it. Free text rather than a list, because the set of models in circulation changes faster than this repository releases.
      placeholder: claude-opus-4-6
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Project version
      description: The version field in the plugin manifest, or the commit SHA if you installed from git.
    validations:
      required: true
  - type: textarea
    id: prompt
    attributes:
      label: What you asked for
      description: The prompt that invoked the skill, verbatim.
      render: text
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: What should have happened
      description: Quote the sentence in the skill that says so.
    validations:
      required: true
  - type: textarea
    id: happened
    attributes:
      label: What happened instead
      render: text
    validations:
      required: true
```

## The same fields on GitLab

GitLab has no form schema, so none of the element choices above apply there and nothing on GitLab enforces a required field. The derivation still does: the fields belong in the Markdown template as headings, in the same order, each with the one-line prompt that would have been the field's description. Say plainly in the handover that the template requests these facts and cannot require them, so a report can still arrive empty, and put the reason for each field in the template itself where a reporter will read it.
