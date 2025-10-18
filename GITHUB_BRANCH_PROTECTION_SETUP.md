# GitHub Branch Protection Setup Guide

This guide provides step-by-step instructions for enabling branch protection rules on the `main` and `release/*` branches to secure the v1.0.0 release.

## Prerequisites

- GitHub repository admin access
- Repository: `juanvallejo97/sierra-painting-react`

## Branch Protection Rules

### 1. Protect `main` Branch

Navigate to: **Settings → Branches → Add branch protection rule**

**Branch name pattern**: `main`

**Enable the following rules**:

#### Require a pull request before merging

- [x] Require approvals: **1**
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require review from Code Owners (if CODEOWNERS file exists)

#### Require status checks to pass before merging

- [x] Require branches to be up to date before merging
- **Required status checks**:
  - `build` (from CI workflow)
  - `lint` (from CI workflow)
  - `test` (from CI workflow)
  - `type-check` (from CI workflow)

#### Require conversation resolution before merging

- [x] All conversations on code must be resolved

#### Require signed commits

- [x] Require signed commits (optional but recommended)

#### Require linear history

- [x] Require linear history (prevents merge commits)

#### Include administrators

- [x] Include administrators (ensures even admins follow the rules)

#### Allow force pushes

- [ ] **DO NOT** allow force pushes

#### Allow deletions

- [ ] **DO NOT** allow deletions

---

### 2. Protect `release/*` Branches

Navigate to: **Settings → Branches → Add branch protection rule**

**Branch name pattern**: `release/*`

**Enable the following rules**:

#### Require a pull request before merging

- [x] Require approvals: **2** (higher for release branches)
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require review from Code Owners

#### Require status checks to pass before merging

- [x] Require branches to be up to date before merging
- **Required status checks**:
  - `build`
  - `lint`
  - `test`
  - `type-check`
  - `security-scan` (if available)

#### Require conversation resolution before merging

- [x] All conversations on code must be resolved

#### Require signed commits

- [x] Require signed commits

#### Require linear history

- [x] Require linear history

#### Include administrators

- [x] Include administrators

#### Restrict who can push to matching branches

- [x] Restrict pushes that create matching branches
- **Allowed actors**: Only repository admins and release managers

#### Allow force pushes

- [ ] **DO NOT** allow force pushes

#### Allow deletions

- [ ] **DO NOT** allow deletions

---

## Verification Checklist

After setting up branch protections, verify the following:

- [ ] Cannot push directly to `main` without a PR
- [ ] Cannot merge PR without required approvals
- [ ] Cannot merge PR with failing CI checks
- [ ] Cannot force push to protected branches
- [ ] Admins are subject to the same rules
- [ ] `release/1.0.0` branch is protected

---

## Current Branch Status

As of this setup:

- ✅ `release/1.0.0` branch created
- ✅ Latest code deployed to staging
- ⏳ Branch protections pending manual setup

---

## Quick Commands for Verification

```bash
# List all branches
git branch -a

# Show current branch
git branch --show-current

# Verify remote branches
git ls-remote --heads origin
```

---

## Next Steps After Setup

Once branch protections are enabled:

1. All future changes to `main` must go through PRs
2. Release candidates will be tagged from `release/1.0.0`
3. Hotfixes will follow the release branch workflow
4. Production deployments will only come from release branches

---

## Rollback Procedure

If branch protections cause issues:

1. Navigate to Settings → Branches
2. Click the **Delete** button next to the protection rule
3. Make necessary changes
4. Re-enable protection with updated settings

---

## Contact

For questions or issues with branch protection setup:

- Review GitHub documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- Test protection rules with a non-critical branch first
