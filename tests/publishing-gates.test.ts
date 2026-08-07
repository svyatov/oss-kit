import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8")

test("oss-publish defines one default publication gate", () => {
  const skill = read("skills/oss-publish/SKILL.md")

  expect(skill).toContain("Configure one publication gate by default")
  expect(skill).toContain("preserve every configured gate")
  expect(skill).toContain("`allow_failure: false`")
  expect(skill).not.toContain("use it as an additional gate")
})

test("npm publish commands use explicit artifact paths", () => {
  const reference = read("skills/oss-publish/references/ecosystems/npm.md")
  const commands = reference.split("\n").filter((line) => line.includes("npm stage publish") && line.includes(".tgz"))

  expect(commands.length).toBeGreaterThan(0)
  for (const command of commands) expect(command, command).toContain("./package/")
})

test("npm and Maven Central do not require duplicate gates", () => {
  const npm = read("skills/oss-publish/references/ecosystems/npm.md")
  const maven = read("skills/oss-publish/references/ecosystems/maven-central.md")

  expect(npm).not.toContain("Two gates apply together")
  expect(maven).not.toContain("Two gates apply together")
  expect(maven).toContain("<autoPublish>true</autoPublish>")
  expect(maven).not.toContain("<autoPublish>false</autoPublish>")
})

test("publishing examples use the release environment name", () => {
  const pypi = read("skills/oss-publish/references/ecosystems/pypi.md")
  const pubdev = read("skills/oss-publish/references/ecosystems/pubdev.md")

  expect(pypi).not.toContain("ENV=pypi")
  expect(pubdev).not.toContain("ENV=pub.dev")
})

test("R-PUB-04 accepts one protected GitLab manual job", () => {
  const standard = read("skills/oss-audit/STANDARD.md")

  expect(standard).toContain("a GitLab protected environment with a blocking manual job")
  expect(standard).not.toContain("a GitLab protected environment with a manual job and approval rules")
})
