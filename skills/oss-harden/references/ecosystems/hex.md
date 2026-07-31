# Hex

## Automated dependency updates (R-SEC-03)

Dependabot's `mix` value carries version updates and not security updates. Private registries are supported and private repositories are not. So an Elixir project on GitHub gets scheduled dependency bumps and never an advisory-driven one, which makes the updater half of this ecosystem's posture the easy half and the watching half the whole problem. The Vulnerability watch section below carries the rest of that consequence.

On GitLab the Renovate manager is `mix`.

## Lockfile and frozen install (R-SEC-08)

Mix writes `mix.lock` without being asked, and the frozen install is `mix deps.get --check-locked`, documented as raising if there are pending changes to the lockfile. Hex's own guidance is to always commit `mix.lock`, and it describes `mix deps.get` as locking the version of a dependency so every developer gets the same one.

### What breaks the first time you commit the lockfile

This is the quietest of the eleven, and two of the three usual failures do not reach it.

**Runtime version is not a documented dimension.** Neither Hex nor Mix documents the resolved set as varying with the Elixir or OTP version, so there is no lowest-runtime rule to follow here and no reason to regenerate per matrix leg. What does vary by runtime is the compiled `_build` tree, so a CI cache keyed on `mix.lock` alone serves artifacts compiled by another OTP release. Key that cache on the OTP and Elixir versions as well as the lock.

**Platform is not a dimension either.** `mix.lock` records a resolved version and a checksum per dependency, with no per-platform entry, so a lock generated on macOS installs on a Linux runner unchanged.

**An umbrella has one lock, and a child that misconfigures its paths gets a second.** Mix defaults `:lockfile` to `mix.lock`, `:deps_path` to `deps`, and the build path alongside them, and an umbrella child overrides all three to point at the parent, conventionally `lockfile: "../../mix.lock"`. A child whose `mix.exs` omits that override resolves its own dependencies into its own lock, which no updater bumps and no root `--check-locked` reads. Read each child's `mix.exs` for the four shared paths before reporting the umbrella locked.

Verified 2026-07-31 against [mix deps.get](https://mix.hexdocs.pm/Mix.Tasks.Deps.Get.html), [Mix.Project](https://mix.hexdocs.pm/Mix.Project.html), and [Hex mix usage](https://hex.pm/docs/usage).

## Static analysis (R-SEC-09)

CodeQL does not support Elixir; it appears nowhere in the supported languages list.

Sobelow is the analyzer this ecosystem publishes, maintained by NCC Group and described as a security-focused static analysis tool for Elixir and the Phoenix framework. It covers insecure configuration, known-vulnerable dependencies, cross-site scripting, SQL injection, command injection, code execution, denial of service, directory traversal, and unsafe serialization. Add it as `{:sobelow, "~> 0.13", only: [:dev, :test], runtime: false}` and run `mix sobelow` from the project root. The flag that makes it a gate rather than a report is `--exit`, which returns a non-zero exit status at or above a confidence threshold of `low`, `medium`, or `high` and defaults to `false`.

GitLab ships the same tool: its SAST table lists Elixir (Phoenix) under the Sobelow analyzer, in the tier that carries the open source analyzers.

## Vulnerability watch (R-SEC-11)

Nothing on the forge watches this ecosystem, and the gap is total rather than partial.

The dependency graph has no Hex row at all: neither `mix.exs` nor `mix.lock` appears anywhere in its supported ecosystems table. The SBOM shows that rather than implying it. Run the SBOM command from `github.md` against `elixir-ecto/ecto` and it reports one `pkg:github` and five `pkg:githubactions` entries and not a single `pkg:hex` package; run it against `phoenixframework/phoenix` and it reports 635 `pkg:npm` packages beside the same zero, from that project's JavaScript assets. The absence is Elixir's, not two repositories that never turned the graph on.

Dependabot's ecosystem table is the second half of it, and it points the same way: `mix` is listed for version updates and not for security updates. So an Elixir project has no watcher until a scanner reads `mix.lock`, and the residual is the ecosystem's whole advisory feed rather than the transitive tail of a parsed manifest.

The advisories themselves do exist. The GitHub Advisory Database names this ecosystem Erlang against the hex.pm registry, so what is missing is not the data but anything on the forge matching it against the project.

`osv-scanner` reads `mix.lock`. On this ecosystem that job is the whole watch rather than a supplement to one, so treat a repository that has it as covered and one that does not as unwatched, whatever the security overview shows.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [mix deps.get](https://mix.hexdocs.pm/Mix.Tasks.Deps.Get.html), [Sobelow](https://github.com/nccgroup/sobelow), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/), with the two SBOM readings taken the same day.
