# Evaluating a skill

Read this when a skill has to be shown to work, rather than shown to conform. Format conformance is what the validator decides; whether the skill improves the task it claims to handle is decided here, and nothing in the frontmatter answers it.

## Evaluate before writing at length

Build the evaluation before the documentation, not after. Run the model on representative tasks with no skill loaded and read what it gets wrong: those failures are the gaps, and they are the only material a skill's instructions have to earn their context against. Write the minimum instruction that closes a gap, run the tasks again, and keep the instruction only where the result moved.

Written the other way round, the evaluation grades what the skill already says. Every instruction passes, including the ones the model would have followed unprompted.

## What an evaluation is

At least three realistic tasks, one of them an edge case, each recorded before it runs:

```json
{
  "skills": ["oss-readme"],
  "query": "Write a README for this library",
  "files": ["package.json", "src/index.js"],
  "expected_behavior": [
    "the opening sentence states what the project is and who it is for",
    "an install block precedes a usage block",
    "no benchmark number appears that the repository cannot prove"
  ]
}
```

Every entry in `expected_behavior` is an outcome that can be observed in the result. "Handles the edge case well" cannot be graded; "reports the missing license file and changes no other file" can. No runner ships with the format, so the record is what makes a run repeatable by hand.

Run each task in a clean context, once with the skill and once against a baseline, either no skill or the previous version. Grade each assertion against concrete evidence from the output. Read the execution trace for steps that were wasted, and record the time and the tokens the run cost. Keep a change only where the improvement justifies that cost.

Activation is nondeterministic, so repeat the runs. For trigger tuning, use varied positive prompts alongside near-miss negatives, and hold a validation set back from the prompts the description was tuned against.

## Author with one instance, use the skill with another

Run two sessions. One authors and refines the skill. The other uses it on real tasks with no view of the editing, and reports what happened. The observations from the second feed the first.

An author cannot evaluate their own skill in the session that wrote it. The intent is already in that context, so an instruction that reads as complete there is one the reader never had to interpret from cold.

## Read the navigation, not only the output

The trace says which files were opened, in what order, and which were never opened at all. Each pattern has a fix:

- A file read on every run belongs in `SKILL.md`. It is not conditional material, and paying a read for it every time is the cost progressive disclosure exists to avoid.
- A bundled file never read is either dead or badly signalled. Delete it, or name it from the body at the branch that needs it and say what makes it worth opening.
- An unexpected read order means the body points at the file too late, after the decision it informs.
- A missed reference that the run needed means the pointer describes the file rather than the situation the reader is in.

These are cheaper to fix than a wording problem and they are invisible in the output, which is why the trace is read rather than skimmed.
