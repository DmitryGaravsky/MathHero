# Build and release

Release instructions for MathHero 1.2.

1. Prepare the version in `package.json` and the root metadata in
   `package-lock.json`. Run the [verification suites](TESTING.md). Inspect
   the generated distribution and record the HTML application version,
   bundled assets, compressed size and service-worker revision.
2. Review the stage results and release criteria in the
   [column arithmetic delivery record](../DELIVERY-COLUMN-ARITHMETIC.md). Keep
   stage PRs on `release/column-arithmetic` until the coordinator accepts the
   complete release.
3. Merge an accepted release to `main`. GitHub Actions verifies on Ubuntu 24.04
   with Node 24.22.1. The deployment job depends on verification. The workflow
   uploads an artifact only for an eligible `main` run. Set GitHub Pages to
   use GitHub Actions and HTTPS.
4. Confirm the live HTTPS app and worker under the case-sensitive
   `/MathHero/` base after deployment. Compare the live worker and precached
   assets against the candidate build. Exercise offline resume in fresh test
   profiles, including multiplication and both marked column drafts. Record
   the actual CI, Pages and browser results in the delivery record. Collect
   [1.2 physical-device acceptance](../DEVICE-ACCEPTANCE-1.2.md) separately.
5. Update [release notes](../../CHANGELOG.md) with user-visible changes,
   compatibility and update instructions. Publish a GitHub Release tagged at
   the verified application commit, linking the current guides and acceptance
   evidence. Keep physical-device results distinct from automated verification.

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

The [MVP](../DELIVERY.md) and [1.1](../DELIVERY-1.1.md) records preserve the
published baseline commits and earlier release evidence.
