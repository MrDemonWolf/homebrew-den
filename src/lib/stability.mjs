// Single stability classifier (was duplicated in build-site.sh + the dead
// shared.js copy). Rules, in precedence: GitHub prerelease flag → "pre-release";
// 0.x semver → "alpha"; a -alpha/-beta/-rc/-dev/-canary/-nightly/-preview suffix
// → its mapped label. Default "stable".
export function detectStability(version, options = {}) {
  let stability = "stable";

  if (options.isGitHubPrerelease) {
    stability = "pre-release";
  }

  if (/^0\./.test(version) && stability === "stable") {
    stability = "alpha";
  }

  if (/-(alpha|beta|rc|dev|canary|nightly|preview)/i.test(version)) {
    if (/alpha/i.test(version)) {
      stability = "alpha";
    } else if (/beta/i.test(version)) {
      stability = "beta";
    } else if (/rc/i.test(version)) {
      stability = "rc";
    } else {
      stability = "pre-release";
    }
  }

  return stability;
}
