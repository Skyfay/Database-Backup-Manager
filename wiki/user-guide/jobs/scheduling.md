# Scheduling

Automate your backups with cron-based scheduling.

## Overview

DBackup uses standard cron expressions for scheduling. When a schedule is set, the job runs automatically at the specified times.

## Cron Expression Format

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

## Common Schedules

### Daily Backups

```bash
# Every day at 2:00 AM
0 2 * * *

# Every day at midnight
0 0 * * *

# Every day at 6:00 PM
0 18 * * *
```

### Multiple Times Per Day

```bash
# Every 6 hours
0 */6 * * *

# Every 4 hours
0 */4 * * *

# Every hour
0 * * * *

# Twice a day (6 AM and 6 PM)
0 6,18 * * *
```

### Weekly Backups

```bash
# Every Sunday at 3:00 AM
0 3 * * 0

# Every Saturday at midnight
0 0 * * 6

# Monday, Wednesday, Friday at 2:00 AM
0 2 * * 1,3,5
```

### Monthly Backups

```bash
# First day of month at 4:00 AM
0 4 1 * *

# Last day of month at midnight (approximation)
0 0 28-31 * *

# 15th of every month
0 0 15 * *
```

### Specific Schedules

```bash
# Weekdays at 1:00 AM
0 1 * * 1-5

# Weekends at 6:00 AM
0 6 * * 0,6

# Every 30 minutes during business hours
*/30 9-17 * * 1-5
```

## Schedule Examples by Use Case

### Production Database (Critical)

Multiple backups per day:
```bash
# Every 4 hours
0 */4 * * *
```

Combined with Smart retention for long-term keeping.

### Development Database

Daily is usually sufficient:
```bash
# Daily at 3:00 AM
0 3 * * *
```

### Large Database (Time-Sensitive)

Schedule during maintenance window:
```bash
# Sunday 2:00 AM (low traffic)
0 2 * * 0
```

### Compliance (Financial)

End of business day:
```bash
# Weekdays at 11:00 PM
0 23 * * 1-5
```

## Time Zone

DBackup uses the server's time zone. In Docker:

```yaml
services:
  dbackup:
    environment:
      - TZ=Europe/Berlin
```

Common time zones:
- `UTC` - Coordinated Universal Time
- `Europe/Berlin` - Central European Time
- `America/New_York` - Eastern Time
- `America/Los_Angeles` - Pacific Time
- `Asia/Tokyo` - Japan Standard Time

## Scheduler Behavior

### Startup

When DBackup starts:
1. Loads all active jobs
2. Calculates next run times
3. Registers with scheduler

### Execution

When scheduled time arrives:
1. Job is queued
2. Respects concurrency limit
3. Executes when slot available

### Missed Schedules

If DBackup was down during scheduled time:
- Missed runs are **not** automatically triggered
- Next run occurs at next scheduled time
- Consider running manually after downtime

## Best Practices

### Stagger Schedules

Don't run all jobs at same time:

```bash
# Job 1: 2:00 AM
0 2 * * *

# Job 2: 2:30 AM
30 2 * * *

# Job 3: 3:00 AM
0 3 * * *
```

### Off-Peak Hours

Run during low-traffic periods:
- Night time (1-5 AM)
- Weekends for large backups
- After business hours

### Match Retention Policy

Align schedule with retention:
- Daily backups → Keep 7-30 daily
- Weekly backups → Keep 4-12 weekly
- Monthly backups → Keep 12-24 monthly

### Consider Database Load

- Production: Multiple times per day
- Staging: Daily
- Development: Daily or weekly

## Monitoring Schedules

### View Next Run

In the Jobs list, see "Next Run" column showing when each job will execute.

### Execution History

Check **History** to verify:
- Jobs ran at expected times
- No missed executions
- Duration is consistent

### Notifications

Set up notifications to alert on:
- Failures (always recommended)
- Successful completions (optional)

## Troubleshooting

### Job Not Running on Schedule

1. Verify job is **Enabled**
2. Check cron expression syntax
3. Confirm time zone is correct
4. Check DBackup logs for errors
5. Verify scheduler is running

### Runs at Wrong Time

1. Check server time zone
2. Set TZ environment variable
3. Restart DBackup after TZ change

### Overlapping Executions

If backups overlap:
1. Increase time between schedules
2. Reduce backup duration (compression)
3. Increase max concurrent jobs

## Cron Expression Generator

Use online tools to generate complex expressions:
- [crontab.guru](https://crontab.guru)
- [cronmaker.com](https://www.cronmaker.com)

## Examples

### Enterprise Backup Strategy

```bash
# Hourly incremental (if supported)
0 * * * *

# Daily full backup at 2 AM
0 2 * * *

# Weekly full to archive at 3 AM Sunday
0 3 * * 0

# Monthly to cold storage
0 4 1 * *
```

### Small Business

```bash
# Daily backup at 1 AM
0 1 * * *

# Weekly comprehensive at 2 AM Sunday
0 2 * * 0
```

### Development Team

```bash
# Before daily standup (9 AM)
0 9 * * 1-5

# End of week archive
0 18 * * 5
```

## Next Steps

- [Retention Policies](/user-guide/jobs/retention) - Automatic cleanup
- [Notifications](/user-guide/features/notifications) - Get alerts
- [Creating Jobs](/user-guide/jobs/) - Job configuration
