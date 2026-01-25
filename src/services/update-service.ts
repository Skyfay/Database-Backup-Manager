import prisma from "@/lib/prisma";
import packageJson from "../../package.json";

interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  currentVersion: string;
  error?: string;
}

const GITLAB_PROJECT_ID = "66715081";
const REGISTRY_ID = "9667280";

export const updateService = {
  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = packageJson.version;

    try {
      // 1. Check if updates are enabled in settings
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "general.checkForUpdates" },
      });

      const isEnabled = setting ? setting.value === "true" : true;

      if (!isEnabled) {
        return {
          updateAvailable: false,
          latestVersion: currentVersion,
          currentVersion,
        };
      }

      // 2. Fetch tags from GitLab Registry API
      // We use the public API since it's a public repository
      const response = await fetch(
        `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/registry/repositories/${REGISTRY_ID}/tags?per_page=5&order_by=updated_at&sort=desc`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.statusText}`);
      }

      const tags: { name: string }[] = await response.json();

      if (!tags || tags.length === 0) {
        return {
            updateAvailable: false,
            latestVersion: currentVersion,
            currentVersion,
        };
      }

      // 3. Find latest semantic version (ignore "dev" or "latest" if we want strict semver,
      // but here we see "v0.1.3-dev". Let's try to parse the highest version number)

      // Filter for tags that look like versions (vX.Y.Z)
      const versionTags = tags
        .map(t => t.name)
        .filter(name => /^v?\d+\.\d+\.\d+/.test(name));

      if (versionTags.length === 0) {
          return {
              updateAvailable: false,
              latestVersion: currentVersion,
              currentVersion,
          };
      }

      // Simple version comparison (taking the first one since we sorted by updated_at desc?
      // GitLab API sort is by updated_at, so the first one IS the latest pushed tag)
      // Ideally we should sort by semver, but for now assuming most recently updated tag is the target.
      // However, "dev" tag might be updated frequently. We want the latest VERSIONED tag.

      const latestTag = versionTags[0];

      // Clean up "v" prefix for comparison
      const cleanLatest = latestTag.replace(/^v/, '').split('-')[0]; // "0.1.3" from "v0.1.3-dev"
      const cleanCurrent = currentVersion.split('-')[0]; // "0.1.0"

      if (compareVersions(cleanLatest, cleanCurrent) > 0) {
        return {
          updateAvailable: true,
          latestVersion: latestTag,
          currentVersion,
        };
      }

      return {
        updateAvailable: false,
        latestVersion: currentVersion,
        currentVersion,
      };

    } catch (error) {
      console.error("Update check failed:", error);
      return {
        updateAvailable: false,
        latestVersion: currentVersion,
        currentVersion,
        error: "Failed to check for updates",
      };
    }
  },
};

// Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;

    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }

  return 0;
}
