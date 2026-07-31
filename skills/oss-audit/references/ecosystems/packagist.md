# Packagist

## Detection signals

Packagist is present when a `composer.json` or a `composer.lock` turns up anywhere in the checkout.

Packagist is shipped when the manifest declares a `vendor/project` name and that name is registered on Packagist. Composer states that "the `name` property is required for published packages (libraries)", and Packagist adds that registration happens once, by submitting the repository URL, after which "new versions of your package are automatically fetched from tags you create in your VCS repository". There is no publish command in a workflow to look for, so the evidence is the registration plus the tags.

Sources: [composer.json schema](https://getcomposer.org/doc/04-schema.md), [About Packagist](https://packagist.org/about).

Three cases decide most arguments:

- A `composer.json` with no `name` declares no package. It is present and can never be shipped. A manifest that exists only to install PHPUnit or a static analyzer is usually this case.
- `"type": "project"` denotes, in Composer's words, "a project rather than a library", which is an application shell rather than something other code depends on. It can still be registered, so read the registration rather than the type: the type narrows the odds, the registration settles the answer.
- A registered package whose hook has lapsed shows an auto-update warning on its Packagist page and is crawled weekly instead of on push. It is still shipped, on a slower path, so report the stale registration rather than the absence of one.

## Release track

Packagist takes the tag-published track. Nothing is uploaded and no publishing credential exists, because the registry reads the forge: a package is registered once and thereafter updated by a forge integration or a weekly crawl, and the tag is what carries the version. That is the evidence that assigns the track, and it is why the release area's preamble drops the four rules that describe an upload. The roster records `"track": "tag-published"` for Packagist and the preamble names it there.

Verified 2026-07-31 against https://getcomposer.org/doc/04-schema.md and https://packagist.org/about.
