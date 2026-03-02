
# Git Workflow: Create a New Branch for Every Ticket

This guide describes the standard workflow to follow **every time you start work on a new ticket**. The goal is to keep `main` clean, make changes in a dedicated branch, and submit work via a Pull Request (PR).

---

## 0) One-time setup (recommended)

Make sure your local repo knows the default branch name (`main`) and your remotes are correct:

```bash
git remote -v
git branch
````

If your default branch is not `main`, adjust the commands below accordingly.

---

## 1) Fetch the latest changes from `origin/main`

Fetching updates your local knowledge of the remote branches without changing your files yet.

```bash
git fetch origin
```

---

## 2) Switch to `main` and update it

Always base your new branch off the latest `main`.

```bash
git checkout main
git pull origin main
```

> Tip: `git pull` = fetch + merge (or rebase depending on config). The key is: **your local `main` should match `origin/main`**.

---

## 3) Create a new branch from `main`

Create a new branch per ticket. Use:

* `feat/` for new features
* `fix/` for bug fixes

Examples:

* `feat/INC1234-discharge-ui`
* `fix/INC5678-null-pointer`
* `feat/SN-204-add-task-buttons`

### Create & switch to the new branch

```bash
git checkout -b feat/x
```

or:

```bash
git checkout -b fix/x
```

---

## 4) Make changes and commit properly

### Check what changed

```bash
git status
git diff
```

### Stage changes

Stage everything:

```bash
git add .
```

Or stage specific files:

```bash
git add path/to/file
```

### Commit with a clear message

Good commit messages are short and describe *what* changed:

```bash
git commit -m "Add discharge task buttons for each provider"
```

Suggested commit message style:

* `Add ...`
* `Fix ...`
* `Update ...`
* `Refactor ...`

> Keep commits focused. If you did multiple unrelated things, consider separate commits.

---

## 5) Keep your branch up to date (while you work)

If `main` changes while you’re working, update your branch so you don’t drift too far.

### Option A: Merge `main` into your branch (simple)

```bash
git fetch origin
git checkout main
git pull origin main
git checkout feat/x
git merge main
```

### Option B: Rebase onto `main` (cleaner history, a bit more advanced)

```bash
git fetch origin
git checkout feat/x
git rebase origin/main
```

If you’re unsure, use **Option A (merge)**.

---

## 6) Push (publish) your branch to the remote

The first push should set the upstream:

```bash
git push -u origin feat/x
```

After that, you can push with:

```bash
git push
```

---

## 7) Open a Pull Request (PR)

Once your branch is pushed, open a PR from:

* **your branch** → `main`

PR checklist:

* Clear title (include ticket ID if applicable)
* Description: what changed + why
* Screenshots / testing notes if relevant
* Any known limitations or follow-ups

---

## 8) After PR is merged (clean up)

After the PR is merged, clean up your local and remote branch.

### Update local `main`

```bash
git checkout main
git pull origin main
```

### Delete local branch

```bash
git branch -d feat/x
```

If Git refuses because it’s not merged (rare if PR merged), force delete:

```bash
git branch -D feat/x
```

### Delete remote branch (optional, often automatic)

```bash
git push origin --delete feat/x
```

---

## Quick command summary (copy/paste workflow)

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/x

# work...
git add .
git commit -m "Describe the change"
git push -u origin feat/x
```

---

## Naming tips

Use a consistent format:

* `feat/<ticket>-short-description`
* `fix/<ticket>-short-description`

Avoid spaces, keep it lowercase, use hyphens:

* ✅ `feat/sn-204-add-discharge-actions`
* ❌ `feat/SN 204 Add Stuff`
