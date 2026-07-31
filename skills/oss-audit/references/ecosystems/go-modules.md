# Go modules

## Detection signals

Go modules are present when a `go.mod` or a `go.sum` turns up anywhere in the checkout. Go's module reference states that "a `go.mod` file must contain exactly one `module` directive" and that the directive "defines the main module's path", so the manifest always carries the identity the ecosystem resolves by.

Go modules are shipped when that module path resolves publicly and a semantic version tag exists for it. There is no publish command to search a workflow for, because Go has no publish step: a module is published by pushing a `vX.Y.Z` tag, which `proxy.golang.org` fetches on demand. The evidence is therefore the tag on the repository the module path names, plus the proxy serving that path at that version.

Source: [Go modules reference](https://go.dev/ref/mod).

Three cases decide most arguments:

- A `go.mod` with no version tag on its repository is present and not shipped. So is one whose module path names a host the code was never pushed to. The absence of a publish step proves nothing either way here, which is what makes this ecosystem different from every registry-push one.
- From major version 2 onward the shipped identity carries the suffix. Go states that "module paths must have a major version suffix like `/v2` that matches the major version", so `example.com/mod` and `example.com/mod/v2` are two identities, and the one to check the proxy for is the one the current `go.mod` declares.
- A `go.mod` under `tools/`, `examples/`, or a test fixture, isolating a build dependency from the main module, is present. A module whose only package is `package main` is still a module: nobody importing it does not make it unshipped, and a tag on a resolvable path is what decides.

## Release track

Go modules take the tag-published track. Nothing is uploaded and no publishing credential exists at all, because the registry side is a proxy that reads the forge: pushing the tag is the publish. That is the evidence that assigns the track, and it is why the release area's preamble drops the four rules that describe an upload. The roster records `"track": "tag-published"` for Go modules and the preamble names them there.

Verified 2026-07-31 against https://go.dev/ref/mod and https://go.dev/doc/modules/publishing.
