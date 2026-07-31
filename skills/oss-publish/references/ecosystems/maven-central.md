# Maven Central

Concrete flow for the decisions `SKILL.md` makes, for a component published to Maven Central through the Sonatype Central Portal. This is the one registry on the roster with no OIDC flow of any kind, so Step 2 below is a gap rather than a configuration, and R-PUB-02's account-scoped clause is what admits the fallback it gives instead. Everything else follows the usual shape, and the approval gate in Step 4 is unusually strong here because the Portal has a registry-side one of its own.

Two things about Maven Central shape every decision below. A release is immutable, and Sonatype's FAQ answers the question of whether a published component can be changed, modified, deleted, removed, or updated with a plain no. And publishing rights are namespace rights, verified against the account, so the credential's blast radius is the namespace rather than a single artifact.

Source: [Central Portal, Generate a portal token](https://central.sonatype.org/publish/generate-portal-token/), [Central Portal, Publishing by using the Portal Publisher API](https://central.sonatype.org/publish/publish-portal-api/), and [Central Portal, Requirements](https://central.sonatype.org/publish/requirements/).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2): a gap, not a check](#configure-trusted-publishing-step-2-a-gap-not-a-check)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5)](#verify-provenance-step-5)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Verifying a namespace for the first time](#verifying-a-namespace-for-the-first-time)

## Gather facts (Step 1)

Read `pom.xml` for `groupId`, `artifactId`, and `version`, or the Gradle build script for `group`, the archives base name, and `version`. The `groupId` prefix is the namespace, and namespace ownership rather than artifact ownership is what the account holds.

Note the build tool, because it decides almost everything downstream. Sonatype publishes a Maven plugin and no Gradle plugin of its own; its documentation lists community Gradle plugins and disclaims them. A Gradle project therefore either uses the Portal Publisher API directly or takes a third-party plugin the maintainer has vetted, and this reference does not choose for them.

Confirm the version is not a `-SNAPSHOT`. The Portal rejects snapshot versions on a release deployment, and a release workflow that pushes one fails at validation rather than at upload.

Check whether a version already exists:

```bash
curl -s -o /dev/null -w '%{http_code}' \
  "https://repo1.maven.org/maven2/$(printf '%s' '<groupId>' | tr . /)/<artifactId>/<version>/"
```

A `200` means it is published and immutable, so the release needs a new version number rather than a retry.

## Configure trusted publishing (Step 2): a gap, not a check

There is no trusted publishing on Maven Central. Sonatype's publishing documentation names no OIDC flow, no workload identity federation, and no CI-provider integration; the only authentication it documents for the Portal is a user token. Read the token and API pages before reporting that, and note that the absence is registry-wide rather than forge-specific: GitHub Actions and GitLab CI/CD are in exactly the same position here, which is why this file has no per-forge split in this step.

Source: [Central Portal, Generate a portal token](https://central.sonatype.org/publish/generate-portal-token/) and [Central Portal, Publishing by using the Portal Publisher API](https://central.sonatype.org/publish/publish-portal-api/).

The strongest documented credential is a user token. Generate it at `https://central.sonatype.com/usertoken`, which produces a username and password pair carrying a display name and an expiry. The Portal API authenticates with the pair base64-encoded and joined by a colon:

```bash
printf 'example_username:example_password' | base64
# Authorization: Bearer <the base64 value>
```

That token is account-scoped. No package-scoped, namespace-scoped, or artifact-scoped form is documented anywhere, so a leaked token reaches every namespace the account can publish to. Scoped tokens appear as a planned item in Sonatype's OSSRH sunset roadmap of 2025-03-26 and have not shipped, so re-read the token documentation before accepting this fallback rather than treating the gap as settled.

R-PUB-02's own clause admits an account-scoped token where the registry documents nothing narrower, and it asks for the compensating controls to be reported beside it rather than assumed. Report all four, because each is something the maintainer has to actually do:

- An expiry set when the token is generated, and a rotation date the project keeps.
- Revocation and replacement on compromise, from the same user token page, which invalidates the old pair.
- Namespace ownership verified against the account, so what the token can reach is bounded by what the account owns.
- A publishing type that holds a validated deployment until a person releases it, which is Step 4 below.

This sits below R-PUB-02's bar and stays there while Sonatype documents nothing narrower than the publishing account. It retires the day scoped tokens ship, or the day the Portal documents an OIDC flow.

Source for the roadmap item: [Central Portal, OSSRH sunset](https://central.sonatype.org/news/20250326_ossrh_sunset/).

## Write the hardened release workflow (Step 3)

The publish job holds two long-lived secrets rather than one, since Central requires a GPG or PGP signature on every file. Both belong in the approval-gated job and nowhere else, and neither should be reachable by a job that builds or tests.

Central's file-level requirements decide what the build has to produce: a `.asc` signature per file, `.md5` and `.sha1` checksums per file with `.sha256` and `.sha512` supported, and sources and javadoc jars for any packaging other than `pom`. The `central-publishing-maven-plugin` assembles the bundle from what the build produced, so the requirement to satisfy is on the build rather than on the upload.

```xml
<plugin>
  <groupId>org.sonatype.central</groupId>
  <artifactId>central-publishing-maven-plugin</artifactId>
  <version>0.11.0</version>
  <extensions>true</extensions>
  <configuration>
    <publishingServerId>central</publishingServerId>
    <autoPublish>false</autoPublish>
  </configuration>
</plugin>
```

Leave `autoPublish` at `false`. The Portal API's equivalent setting is `publishingType`, whose default `USER_MANAGED` holds a validated deployment at the `VALIDATED` state until a person publishes it, where `AUTOMATIC` proceeds to Maven Central on its own. Confirm the plugin's mapping against the plugin documentation before relying on it as the approval gate, because the gate is the whole reason for the setting.

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-java@v5
        with:
          java-version: '<the version the project targets>'
          distribution: temurin
      - run: mvn --batch-mode verify  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)

  publish:
    runs-on: ubuntu-latest
    needs: [test]
    environment: release
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-java@v5
        with:
          java-version: '<the version the project targets>'
          distribution: temurin
          server-id: central
          server-username: MAVEN_CENTRAL_USERNAME
          server-password: MAVEN_CENTRAL_PASSWORD
          gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
          gpg-passphrase: MAVEN_GPG_PASSPHRASE
      - run: test "${GITHUB_REF_NAME#v}" = "$(mvn --batch-mode -q help:evaluate -Dexpression=project.version -DforceStdout)"
      - run: mvn --batch-mode deploy -DskipTests
        env:
          MAVEN_CENTRAL_USERNAME: ${{ secrets.MAVEN_CENTRAL_USERNAME }}
          MAVEN_CENTRAL_PASSWORD: ${{ secrets.MAVEN_CENTRAL_PASSWORD }}
          MAVEN_GPG_PASSPHRASE: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
```

`setup-java` writes the `settings.xml` server entry from the two environment variable names, so the credential never appears in a file the repository tracks. `server-id` must match `publishingServerId` in the plugin configuration exactly, and the pair the two secrets hold is the token username and password from Step 2, not a Sonatype account password.

`-DskipTests` in the publish job is deliberate: the tests ran in the uncredentialed job, and re-running them in the job holding the token and the signing key puts the project's whole test dependency tree inside the credentialed blast radius. `mvn deploy` still compiles and packages there, which is the residual this reference cannot remove, because the Maven plugin builds the bundle from a build in that same reactor.

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test job's minimal permissions. On GitLab CI/CD the same `mvn deploy` runs unchanged: the credential path is identical because there is no OIDC on either forge. What differs is only where the two secrets live, which is a masked and protected CI/CD variable, and how the gate is configured, which is a protected environment with approval rules.

Neither `setup-java` block above sets `cache`, so nothing is restored. `oss-harden` owns dependency caching under R-CI-04, and a restored cache in a job that can sign and publish is the same cache-poisoning exposure every other reference in this directory refuses; leave the input off rather than setting it to a value.

## Gate on manual approval (Step 4)

Two gates apply together here, and Maven Central is unusual in having a real registry-side one.

The workflow gate is `environment: release` on the publish job above, with required reviewers configured at `https://github.com/<owner>/<repo>/settings/environments/new`, or a GitLab protected environment with approval rules. Required reviewers work for public repositories on current GitHub plans; private or internal repositories need GitHub Enterprise Cloud.

The registry gate is the `USER_MANAGED` publishing type. A deployment uploaded that way runs through validation, stops at the `VALIDATED` state, and waits for a person to publish it from the Portal interface or through a second authenticated call to `/api/v1/publisher/deployment/<deploymentId>`. That is a genuine proof-of-presence gate in the sense R-PUB-04 asks for, and it survives a compromised workflow, because the workflow cannot approve itself without the token being used a second time by whoever is watching the Portal.

Keep both. Where the forge plan provides no native gate, the Portal gate alone can satisfy R-PUB-04, which puts Maven Central in a better position than most of this directory. Say so plainly rather than reporting the rule unmet. What a maintainer must not do is set `autoPublish` to `true` to make the pipeline finish green, because that removes the only gate a compromised release workflow cannot walk through.

## Verify provenance (Step 5)

Maven Central serves no build provenance. What it does serve is signatures, and the two must not be conflated: the required GPG or PGP signature says a key vouched for these bytes, and provenance says which commit and workflow produced them. The `.asc` files are a requirement for acceptance, not a link back to a build.

Sigstore is the moving part here, and its current state is easy to overstate. Sonatype announced Sigstore signature validation through the Portal on 2025-01-28, and the announcement's own words are that "not providing Sigstore signatures will not cause your deployment to fail, but providing invalid Sigstore signatures will eventually do so". Read that as it stands: signatures are not required today, an invalid bundle produces a warning on the deployments page today, and blocking is stated future intent rather than current behavior. Do not tell a maintainer their deployment will fail on a bad Sigstore bundle, and do not tell them Sigstore satisfies R-PUB-03 either, because a Sigstore signature over a jar is still a signature rather than a statement about the build.

Source: [Central Portal, Sigstore signature validation via the Portal](https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/).

The strongest substitute is a forge attestation over the exact jars the deployment uploaded, added in a job after the publish and verified against what a consumer downloads from Maven Central:

```bash
gh attestation verify <artifactId>-<version>.jar --repo <owner>/<repo>
```

Central does not surface or link to that attestation, so a consumer has to know it exists. What a consumer can check unaided is the GPG signature, if the project publishes the key's fingerprint somewhere they can find it, which is what R-PUB-06 asks for in the neighbouring case.

This sits below R-PUB-03, which asks for provenance tied to the exact published artifact and the workflow that built it. Report it as unmet with the registry limitation named. It retires the day Central serves an attestation for a published component, and the Sigstore work is the thing to watch, since a required and validated Sigstore bundle from a CI identity would be most of the way there.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Deploying to Maven Central attaches nothing to the forge, and the source archives GitHub generates for a tag are not built assets, so a library that only deploys goes to Step 7 instead. The jars themselves are already signed, by the GPG requirement in Step 3, and that signature is what R-PUB-06 asks for on the registry side.

This reference names no SBOM generator for Java. The ones in common use are plugins rather than part of Maven or Gradle, and a plugin that reads the dependency tree inside a job holding a signing key is one the maintainer vets before it goes there. Until one is vetted, publish the hashes of what the release attaches and sign those:

```yaml
  release:
    runs-on: ubuntu-latest
    needs: [publish]
    permissions:
      contents: write
      id-token: write
      attestations: write
      artifact-metadata: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: jars
          path: dist/
      - run: (cd dist && sha256sum *) > SHA256SUMS
      - uses: actions/attest@v4
        with:
          subject-checksums: SHA256SUMS
      - run: gh release upload "$GITHUB_REF_NAME" dist/* SHA256SUMS
        env:
          GH_TOKEN: ${{ github.token }}
```

`sha256sum` runs from inside `dist/` so the names it writes are the names the assets carry on the release. `subject-checksums` makes every file in the manifest a subject of the attestation in its own right, by name and digest; attesting `SHA256SUMS` itself with `subject-path` would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. `--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins which workflow the attestation must have come from.

The four grants above are copied exactly, on this job only, and the workflow's top-level block stays `contents: read`. `needs: [publish]` keeps the assets behind the approval gate. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s. On GitLab CI/CD the forge attestation is unavailable, so a GitLab release can carry the same `SHA256SUMS` with nothing signing it; say that rather than presenting the file as provenance.

## Verifying a namespace for the first time

Publishing rights are per namespace, and a namespace is verified before the first deployment. Two paths are documented: a DNS TXT record on the domain the `groupId` is derived from, or a temporary public repository named after the verification key the Portal issues. A GitHub signup gets `io.github.<username>` verified automatically, which is the shortest route for a project that does not own a domain.

Do the namespace work before writing any of the workflow above, because a deployment into an unverified namespace fails at the Portal rather than at the build, and the failure reads like a credential problem.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [Central Portal, Publishing by using the Portal Publisher API](https://central.sonatype.org/publish/publish-portal-api/), [Central Portal, Publishing by using the Maven plugin](https://central.sonatype.org/publish/publish-portal-maven/), [Central Portal, Generate a portal token](https://central.sonatype.org/publish/generate-portal-token/), and [Central Portal, Requirements](https://central.sonatype.org/publish/requirements/). The OSSRH sunset and Sigstore announcements linked above were read the same day.
