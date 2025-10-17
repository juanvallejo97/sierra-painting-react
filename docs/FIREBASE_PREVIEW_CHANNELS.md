# Firebase Preview Channels

Complete guide for Firebase Hosting preview channels - automatic preview deployments for pull requests.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Setup Guide](#setup-guide)
- [Using Preview Channels](#using-preview-channels)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Firebase Preview Channels create temporary hosting environments for each pull request, allowing you to:

- ✅ **Preview changes** before merging
- ✅ **Share with stakeholders** via unique URLs
- ✅ **Test in production-like environment**
- ✅ **Automatic cleanup** after 7 days
- ✅ **Comment on PR** with preview URL
- ✅ **No manual deployment** needed

## How It Works

### Workflow

1. **Developer creates PR** → Opens/updates pull request
2. **GitHub Action triggers** → Builds and deploys to preview channel
3. **Bot comments on PR** → Adds preview URL to PR comments
4. **Team reviews** → Tests changes in preview environment
5. **PR merged/closed** → Preview channel auto-expires after 7 days

### Architecture

```
Pull Request → GitHub Actions
    ↓
  Build App
    ↓
  Deploy to Firebase Preview Channel
    ↓
  pr-123.sierra-painting-staging.web.app
    ↓
  Auto-expires in 7 days
```

### Preview Channel URLs

Each PR gets a unique URL:
```
https://sierra-painting-staging--pr-{PR_NUMBER}-{CHANNEL_ID}.web.app
```

Example:
```
https://sierra-painting-staging--pr-42-abc123.web.app
```

## Setup Guide

### 1. Prerequisites

- ✅ Firebase project with Hosting enabled
- ✅ GitHub repository with Actions enabled
- ✅ Firebase service account with hosting permissions

### 2. Required Secrets

Configure these in **Settings → Secrets and variables → Actions**:

```
STAGING_FIREBASE_API_KEY
STAGING_FIREBASE_AUTH_DOMAIN
STAGING_FIREBASE_PROJECT_ID
STAGING_FIREBASE_STORAGE_BUCKET
STAGING_FIREBASE_MESSAGING_SENDER_ID
STAGING_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_STAGING
```

**Note**: Preview channels use the staging Firebase project.

### 3. Verify Workflow File

The workflow file is at: `.github/workflows/preview-deploy.yml`

**Trigger events**:
```yaml
on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]
```

### 4. Test Preview Channel

```bash
# Create a test branch
git checkout -b test/preview-channel

# Make a change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: preview channel"
git push origin test/preview-channel

# Create PR on GitHub
# Watch for bot comment with preview URL
```

## Using Preview Channels

### Creating a Preview

1. **Create feature branch**:
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes**:
   ```bash
   # Edit files
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and create PR**:
   ```bash
   git push origin feature/new-feature
   # Open PR on GitHub
   ```

4. **Wait for deployment** (~5-10 minutes):
   - GitHub Action runs automatically
   - Bot comments on PR with preview URL

5. **Test preview**:
   - Click preview URL in PR comment
   - Test functionality
   - Share with team/stakeholders

### Updating a Preview

**Preview auto-updates on each push**:

```bash
# Make more changes
git add .
git commit -m "feat: update feature"
git push

# Preview channel redeploys automatically
# Check PR comments for updated deployment status
```

### Preview URL Format

**Comment includes**:
```markdown
## 🔍 Preview Deployment

**Status**: ✅ Deployed successfully
**Preview URL**: https://your-preview-url
**Expires**: 7 days from now

### Quick Links
- 🏠 [Home](url)
- 🔐 [Login](url/login)

### Testing Checklist
- [ ] Login functionality works
- [ ] Navigation works correctly
- [ ] Forms are functional
- [ ] No console errors
```

## Configuration

### Expiration Time

Default: **7 days**

**To change**:
```yaml
# In .github/workflows/preview-deploy.yml
- name: Deploy to Firebase Preview Channel
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    expires: 14d  # Change to 14 days
```

**Options**:
- `7d` = 7 days
- `14d` = 14 days
- `30d` = 30 days

### Environment Variables

Preview channels use **staging** environment:

```yaml
VITE_ENV: preview
VITE_APP_VERSION: preview-pr-{PR_NUMBER}
VITE_SENTRY_ENABLED: false
```

**To enable Sentry for previews**:
```yaml
VITE_SENTRY_ENABLED: true
VITE_SENTRY_DSN: ${{ secrets.STAGING_SENTRY_DSN }}
```

### Quality Checks

By default, quality checks are **non-blocking**:

```yaml
- name: Run linter
  run: npm run lint
  continue-on-error: true  # Doesn't block deployment
```

**To make checks blocking**:
```yaml
- name: Run linter
  run: npm run lint
  # Remove continue-on-error
```

## Best Practices

### 1. Use Preview URLs in PRs

**Include preview URL in PR description**:
```markdown
## Changes
- Added new feature X
- Fixed bug Y

## Preview
🔗 [Test the changes here](preview-url)

## Testing
- [x] Tested on Chrome
- [x] Tested on Firefox
- [x] Mobile responsive
```

### 2. Share with Stakeholders

**Preview channels are perfect for**:
- Product managers reviewing features
- Designers checking UI changes
- QA testing before merge
- Client demos

**Example message**:
```
Hi team! 👋

I've implemented the new invoice feature.
Please test it here: [Preview URL]

Feedback welcome!
```

### 3. Use Testing Checklist

**Standard checklist**:
```markdown
### Preview Testing Checklist
- [ ] Login works
- [ ] Navigation works
- [ ] Forms submit correctly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Accessibility (screen reader)
- [ ] Performance (Lighthouse)
```

### 4. Clean Up Stale PRs

**Preview channels auto-expire**, but you can manually clean up:

```bash
# List all channels
firebase hosting:channel:list --project staging-project-id

# Delete specific channel
firebase hosting:channel:delete pr-123 --project staging-project-id
```

### 5. Monitor Preview Usage

**Check Firebase Console**:
- Hosting → Preview channels
- View all active previews
- See expiration dates
- Delete if needed

## Troubleshooting

### Preview Not Deploying

**Check workflow status**:
1. Go to PR → Checks tab
2. Look for "Deploy Preview Channel"
3. Click to see logs

**Common issues**:

**Build fails**:
```bash
# Run build locally
npm run build

# Fix any errors
npm run lint
npm run type-check
```

**Missing secrets**:
```
Error: Missing required secret STAGING_FIREBASE_API_KEY
```

**Solution**: Add secret in Settings → Secrets

**Firebase permissions**:
```
Error: Permission denied
```

**Solution**: Check service account has `Firebase Hosting Admin` role

### Preview URL Not in Comments

**Check bot permissions**:
- Bot needs write access to post comments
- Check workflow permissions:

```yaml
permissions:
  contents: read
  pull-requests: write  # Required for comments
```

**Manual check**:
1. Go to Actions → Workflow run
2. Look for "Deploy to Firebase Preview Channel" step
3. Find preview URL in logs

### Preview Shows Old Version

**Cache issue** - Hard refresh:
- Chrome: `Ctrl + Shift + R`
- Firefox: `Ctrl + Shift + R`
- Safari: `Cmd + Shift + R`

**Or**:
```bash
# Check deployment status
firebase hosting:channel:list --project staging-project-id
```

### Preview Expired

**Error**: `404 - Preview channel not found`

**Reason**: Preview expired after 7 days

**Solution**:
1. Push new commit to PR
2. New preview will be created
3. Or merge PR if ready

### Build Succeeds But Preview Fails

**Check Firebase quota**:
- Go to Firebase Console → Usage
- Check if hosting quota exceeded
- Upgrade plan if needed

**Check site configuration**:
```bash
# Verify firebase.json
cat firebase.json

# Should have hosting configuration
```

## Advanced Usage

### Multiple Preview Channels

**Deploy to multiple environments**:

```yaml
# Deploy to both staging and production preview
- name: Deploy to staging preview
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    projectId: staging-project-id
    channelId: pr-${{ github.event.pull_request.number }}-staging

- name: Deploy to production preview
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    projectId: production-project-id
    channelId: pr-${{ github.event.pull_request.number }}-prod
```

### Custom Channel IDs

**Use descriptive channel names**:

```yaml
channelId: feature-${{ github.head_ref }}
# Results in: https://project--feature-new-ui.web.app
```

### Conditional Previews

**Only deploy for specific labels**:

```yaml
on:
  pull_request:
    types: [labeled]

jobs:
  deploy-preview:
    if: contains(github.event.pull_request.labels.*.name, 'needs-preview')
```

### Integration with Visual Regression

**Add Percy, Chromatic, etc**:

```yaml
- name: Run visual regression
  run: npx percy exec -- npm run test:visual
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
    PERCY_BRANCH: pr-${{ github.event.pull_request.number }}
```

## Cost Considerations

### Firebase Hosting Limits

**Spark (Free) Plan**:
- 1 GB storage
- 10 GB/month bandwidth
- **Limited preview channels**

**Blaze (Pay-as-you-go)**:
- $0.026/GB storage
- $0.15/GB bandwidth
- **Unlimited preview channels**

### Optimizing Costs

**Reduce preview duration**:
```yaml
expires: 3d  # 3 days instead of 7
```

**Limit preview channels**:
```yaml
# Only create previews for main branch PRs
on:
  pull_request:
    branches: [main]  # Remove develop
```

**Clean up manually**:
```bash
# Delete old channels
firebase hosting:channel:delete pr-old-number
```

## Security Considerations

### 1. Preview URLs Are Public

**Preview URLs are public** - anyone with the URL can access.

**For sensitive features**:
- Don't include real user data
- Use test/mock data
- Add authentication if needed

### 2. Environment Variables

**Never commit**:
- API keys
- Passwords
- Tokens

**Always use GitHub Secrets** for sensitive data.

### 3. Firestore Rules

Preview channels use **staging Firestore** with same security rules.

**Test access control**:
```bash
# Verify rules work in preview
# Try accessing restricted data
```

## Metrics and Monitoring

### Track Preview Usage

**Firebase Console**:
- Hosting → Preview channels
- See traffic, bandwidth
- Monitor costs

**GitHub Insights**:
- Actions → Workflows
- Check success rate
- Monitor duration

### Success Metrics

**Healthy preview system**:
- ✅ 95%+ deployment success rate
- ✅ < 10 minutes deployment time
- ✅ < 5 active channels at once
- ✅ Regular cleanup (< 10 expired channels)

## Additional Resources

- [Firebase Preview Channels Docs](https://firebase.google.com/docs/hosting/test-preview-deploy)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Firebase Hosting GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)

## Support

**Issues with preview channels**:
1. Check workflow logs
2. Verify secrets are configured
3. Check Firebase Console for errors
4. Review service account permissions

---

**Last Updated**: 2025-10-17
**Version**: 1.0.0
**Status**: ✅ Active
