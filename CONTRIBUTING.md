# Contributing to Scrapy Copilot

First off, thank you for considering contributing to Scrapy Copilot! It's people like you who make the open-source community an amazing place to learn, inspire, and create.

To maintain repository hygiene, build trust, and ensure smooth collaboration, we ask all contributors to follow the standards outlined below.

---

## Code of Conduct

Please be respectful, constructive, and helpful when interacting with other contributors and users. Focus on collaboration and improving the quality of the tool for everyone.

---

## How Can I Contribute?

### 1. Reporting Bugs
* Search the existing issue tracker to make sure the bug hasn't already been reported.
* Create a new issue describing:
  * Expected behavior.
  * Actual behavior.
  * Steps to reproduce with example URLs if possible.
  * Details about your operating system, Google Chrome version, and extension version.

### 2. Suggesting Enhancements
* Open a feature request issue.
* Explain the problem solved by the feature, why it is useful, and how it could behave.

### 3. Submitting Code Changes
* Check open issues or create a new issue before submitting a major code change.
* Follow the branch naming and commit guidelines below.
* Ensure all code compiles cleanly and adheres to TypeScript/React standards.

---

## Development Workflow

### Step 1: Branch Naming Conventions
When starting a new task, create a branch with a clean, descriptive name using the following prefixes:

| Branch Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New features or extensions | `feat/har-export-support` |
| `fix/` | Bug fixes or resolving issues | `fix/popup-state-reset` |
| `docs/` | Documentation improvements | `docs/add-contributing-guide` |
| `refactor/` | Code refactoring (no new feature/fix) | `refactor/gemini-client-cleanup` |
| `chore/` | Build scripts, dependencies, configuration | `chore/update-typescript` |

### Step 2: Write Clean Commit Messages
We follow the **Conventional Commits** standard. Commit messages must be written in English and explain *what* and *why* changes are made. Avoid generic descriptions like `fix`, `update`, `ready`, or `düzeldi`.

#### Commit Format
```
<type>(<scope>): <short description>

[Optional longer body explaining details]
```

* **`<type>`** must be one of:
  * `feat`: A new feature.
  * `fix`: A bug fix.
  * `docs`: Documentation updates.
  * `refactor`: A code change that neither fixes a bug nor adds a feature.
  * `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.).
  * `test`: Adding missing tests or correcting existing tests.
  * `chore`: Changes to the build process or auxiliary tools/libraries.
* **`<scope>`** (optional) describes the part of the codebase affected (e.g., `popup`, `inject`, `manifest`).
* **`<description>`** must be written in present tense, lowercase, and no period at the end (e.g., `add selector highlight`).

#### Correct Examples:
* `feat(popup): integrate Gemini chat interface`
* `fix(inject): resolve headers intercept leak`
* `docs(readme): update build commands guide`
* `refactor(background): clean up token masking logic`

#### Incorrect Examples (Do Not Use):
* `fix`
* `working now`
* `geliştirmeler yapıldı`
* `son`

---

## Pull Request Guidelines

1. **Keep it focused:** Avoid mixing unrelated refactors, feature additions, and styling fixes into a single PR.
2. **Build and Test:** Run the build steps locally and ensure that all TypeScript checks pass before raising a PR:
   ```bash
   npm run type-check
   npm run build
   ```
3. **Reference Issues:** Link your PR to the corresponding issue in the description (e.g. `Closes #12`).
4. **Draft PRs:** If your work is still in progress, open a "Draft Pull Request" to let maintainers know.

---

Thank you again for contributing!
