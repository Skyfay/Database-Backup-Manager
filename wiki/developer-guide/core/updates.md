# Update Service

The Update Service checks for new versions of Database Backup Manager by querying the GitLab Container Registry API.

## How It Works

1. **Configuration Check**: Reads `general.checkForUpdates` from SystemSettings
2. **API Query**: Fetches the last 20 tags from GitLab API
3. **Channel Detection**: Determines the stability channel of the current installation
4. **Filtering**: Filters available updates based on current channel
5. **SemVer Comparison**: Sorts tags and checks for newer versions

## Channel Logic

The system distinguishes three stability levels. Users only see updates that are equally or more stable than their current version.

| Current Channel | Version Pattern | Stability | Visible Updates |
|-----------------|-----------------|-----------|-----------------|
| **Stable** | `x.y.z` | 3 | Stable only |
| **Beta** | `x.y.z-beta` | 2 | Beta + Stable |
| **Dev** | `x.y.z-dev` | 1 | Dev + Beta + Stable |

### Stability Calculation

```typescript
function getStability(prerelease: string | null): number {
  if (prerelease === null) return 3; // Stable
  if (prerelease.includes('beta')) return 2;
  if (prerelease.includes('dev')) return 1;
  return 0; // Unknown
}
```

Only tags with `TargetStability >= CurrentStability` are considered.

## Semantic Versioning

Comparison follows strict [SemVer](https://semver.org/) rules:

1. **Major/Minor/Patch**: Numeric comparison (`1.1.0 > 1.0.9`)
2. **Pre-Release**: When versions match, stable wins
   - `1.0.0` > `1.0.0-beta` > `1.0.0-dev`

## Service Implementation

**Location**: `src/services/update-service.ts`

```typescript
class UpdateService {
  async checkForUpdates(): Promise<UpdateCheckResult> {
    // Check if feature is enabled
    const enabled = await getSystemSetting('general.checkForUpdates', true);
    if (!enabled) return { available: false };

    // Fetch tags from registry
    const tags = await this.fetchTags();

    // Get current version
    const current = this.getCurrentVersion();

    // Find latest compatible update
    const latest = this.findLatestUpdate(tags, current);

    return {
      available: latest !== null,
      currentVersion: current,
      latestVersion: latest,
    };
  }

  private async fetchTags(): Promise<string[]> {
    const response = await fetch(
      'https://gitlab.com/api/v4/projects/12345/registry/repositories/67890/tags',
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    return response.json();
  }
}
```

## API Endpoint

```http
GET /api/system/updates
```

**Response:**
```json
{
  "available": true,
  "currentVersion": "0.8.3-beta",
  "latestVersion": "0.9.0-beta",
  "releaseUrl": "https://gitlab.com/Skyfay/dbackup/-/releases/v0.9.0-beta",
  "releaseNotes": "Microsoft SQL Server support..."
}
```

## System Task Integration

The update check runs as a system task (`system.update_check`):

- **Default Schedule**: Daily at 4 AM (`0 4 * * *`)
- **On Startup**: Optionally run on application start
- **Manual Trigger**: Via Settings → System Tasks

```typescript
// Register system task
registerTask({
  id: 'system.update_check',
  name: 'Check for Updates',
  schedule: '0 4 * * *',
  handler: async () => {
    const result = await updateService.checkForUpdates();
    if (result.available) {
      await notifyAdmins(result);
    }
  },
});
```

## UI Notification

When an update is available, a notification appears in the dashboard:

```tsx
function UpdateBanner() {
  const { data } = useSWR('/api/system/updates');

  if (!data?.available) return null;

  return (
    <Alert>
      <AlertTitle>Update Available</AlertTitle>
      <AlertDescription>
        Version {data.latestVersion} is available.
        <Link href={data.releaseUrl}>View Release Notes</Link>
      </AlertDescription>
    </Alert>
  );
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `general.checkForUpdates` | `true` | Enable/disable update checks |
| `general.updateCheckSchedule` | `0 4 * * *` | Cron schedule |
| `general.notifyOnUpdate` | `true` | Show UI notification |

## Caching

API responses are cached for 1 hour to reduce external requests:

```typescript
fetch(url, {
  next: { revalidate: 3600 }, // Next.js cache
});
```

The cache can be manually invalidated via the System Tasks UI.
