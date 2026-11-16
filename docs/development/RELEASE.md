# Build and release

Status — active release instructions for MathHero 1.1.

1. Prepare the version in `package.json` and the root metadata in
   `package-lock.json`. Run the [verification suites](TESTING.md). Inspect
   the generated distribution and record the service-worker revision.
2. Review the stage results and release criteria in the
   [1.1 delivery record](../DELIVERY-1.1.md). Keep stage PRs on the release
   integration branch until the coordinator accepts the complete release.
3. Merge an accepted release to `main`. GitHub Actions verifies on Ubuntu 24.04
   with Node 24.22.1. The deployment job depends on verification. The workflow
   uploads an artifact only for an eligible `main` run. Set GitHub Pages to
   use GitHub Actions and HTTPS.
4. Confirm the live HTTPS app and worker under the case-sensitive
   `/MathHero/` base after deployment. Exercise install, offline resume and
   persisted learning in fresh test profiles. Record the actual CI, Pages and
   browser results. Collect [physical-device acceptance](../DEVICE-ACCEPTANCE.md)
   separately.

The build allowlist permits only the app shell, bundled JS/CSS, web manifest,
icons and worker. The documentation, original source attachment, screenshots,
test data and source maps stay out of `dist/`. Action SHAs and the npm lockfile
pin release inputs. Verify compatibility before changing them.

The generated worker revisions the precache from the built assets and worker
template. A complete update waits for all scoped clients to close before it
activates. Installation failure preserves the previous release. Activation
cleans only old caches for the MathHero scope. IndexedDB persists across the
worker update. See [user update instructions](../user/SETTINGS.md#apply-an-update).

After updating the icon artwork, run `npm run icons:generate` with Chromium
installed. Rebuild to check the manifest and icon dimensions.
