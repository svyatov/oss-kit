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

## Choosing the categories

Ship one template per kind of work that gets triaged differently. A defect and a proposal land in different parts of a maintainer's week, so they are two templates. A distinction that only sets a label or names a component is a field inside one template instead of a second file, because near-identical templates drift apart the first time one of them is updated.

Questions and support requests are the largest source of tracker noise and the one templates cannot fix, since a question is not a defect whatever shape it is filed in. Route them out of the tracker with `contact_links` in the chooser config, pointing at the discussion forum, chat channel, or mailing list where the project actually answers them. That routing is what R-COM-09 scores, and it scores only projects that run such a channel. Where a project has nowhere to route them, leave the blank issue enabled rather than closing the only door: R-DOC-08 requires a public channel for questions, and if the tracker is that channel then it has to accept a question that fits no template.

The reverse case is worth naming too, because it is the one a maintainer creates by accident. A project that opens a forum and leaves the chooser silent has moved nothing: the door a reporter sees is still the tracker, so the questions keep arriving there and the forum stays empty, which then reads as evidence nobody wanted one.

## The same fields on a forge with no form schema

GitLab has no form schema, so nothing there enforces a required field and no element type carries a fact. The derivation above still holds. The facts become headings in a Markdown description template, in the same order, each with the one-line prompt that would have been a field's description. Say plainly in the handover that the template requests these facts and cannot require them, so a report can still arrive empty, and put the reason for each field in the template itself where a reporter will read it.
