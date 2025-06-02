# Contributing

The following is a set of guidelines for contributing to App Suite UI core.  Feel free to propose changes to this document.

## Table Of Contents

[Style guides](#style-guides)

- [Git Commit Messages](#git-commit-messages)
- [Changelog](#changelog)
  - [Example commit with extended Changelog](#example-commit-with-extended-changelog)
- [JavaScript Style Guide](#javascript-style-guide)
- [Security](#security)
  - [Scanners running with every pipeline](#scanners-running-with-every-pipeline)
  - [Scanners running in scheduled pipelines](#scanners-running-in-scheduled-pipelines)
  - [Container Security Measures](#container-security-measures)
  - [Other Code Quality Measures](#code-quality-measures)

## Local development

See [README.md](README.md)

## Style Guides

### Git Commit Messages

- Use the present tense ("Add: OXUIB-1234: Cool feature" not "Added: OXUIB-1234: Cool feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- When only changing things which do not need a pipeline run, include `[ci skip]` or `[skip ci]` in the commit message
- Reference JIRA issues like this e.g. OXUI-1234
- See also next section for how commits are being used for automatic changelog entries

### Changelog

The format is based on [Keep a Changelog],
and this project adheres to [Semantic Versioning].

If you want your commit message to appear in our [changelog](CHANGELOG.md) you can add one of these keywords that is appropriate for you:

- **Add(ed):** for new features.
- **Change(d):** for changes in existing functionality.
- **Deprecate(d):** for soon-to-be removed features.
- **Remove(d):** for now removed features.
- **Fix(ed):** for any bug fixes.
- **Security:** in case of vulnerabilities.

The prefixed keyword will removed from the changelog entry and the entry will be added to its corresponding section.

In case you want to write an extended changelog entry in a commit you can add `Changelog:` to your commit message.

If you want your commit to be highlighted as a breaking change. please add "This is a breaking change." to the body of your commit message.

#### Example commit with extended Changelog

```shell
% git commit
```

```text
Add: OXUI-1234: Cool new Feature

- Only the first line will appear in the changelog
- so you can add technical details that won't appear in the changelog

Changelog:
  - This will appear under the first line in the changelog
  - This also
    - This one too
```

will produce following changelog entry (markdown):

```markdown
### Added

- [`OXUIB-1234`](https://jira.open-xchange.com/browse/OXUIB-1234): Cool new Feature
  - This will appear under the first line in the changelog
  - This also
    - This one too
```

### JavaScript Style Guide

All JavaScript code is linted with [ESLint] and follows the [JavaScript Standard Style].

## Security

### Scanners running with every pipeline

- [yarn audit] - Performs a vulnerability audit against dependencies
- [ESLint] following JavaScript Standard Style
- [Spectral OPS]
- Regression tests (Part of our e2e tests)

### Scanners running in scheduled pipelines

- [Synopsys Detect (formerly known as Blackduck)] - reports are only sporadically checked
- [Coverity] - reports are only sporadically checked
- [Dependabot] - Automatically opens merge requests for out-of-date dependencies

### Container Security Measures

- "Distroless" images
- Use non-root user in containers
- [Spectral OPS]

### Other Code Quality Measures

- [Lint staged] - Runs linters against staged git files
- Code reviews - Before accepting merge requests we encourage code reviews

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[JavaScript Standard Style]: https://standardjs.com/rules.html
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
[ESLint]: https://eslint.org/
[Synopsys Detect (formerly known as Blackduck)]: https://community.synopsys.com/s/document-item?bundleId=integrations-detect&topicId=introduction.html&_LANG=enus
[Coverity]: https://scan.coverity.com/
[Dependabot]: https://gitlab.com/dependabot-gitlab/dependabot
[yarn audit]: https://classic.yarnpkg.com/lang/en/docs/cli/audit/
[Spectral OPS]: https://spectralops.io/

[Dependabot Dashboard]: https://dependabot.k3s.os2.oxui.de/
[Synopsys Detect (formerly known as Blackduck) Dashboard]: https://blackduck.open-xchange.com/
[Coverity Dashboard]: https://coverity.open-xchange.com/login/login.htm
[Lint staged]: https://www.npmjs.com/package/lint-staged
