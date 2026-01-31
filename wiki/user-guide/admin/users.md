# User Management

Manage user accounts in DBackup.

## Overview

DBackup supports multiple users with role-based access control:
- Multiple user accounts
- Group-based permissions
- SSO/OIDC integration
- Two-factor authentication

## First User

The first user to sign up becomes the administrator:
1. Open DBackup login page
2. Click **Sign Up**
3. Create your account
4. This account has full permissions

::: warning First User Only
Self-registration is only available for the first user. Additional users must be created by an admin.
:::

## Managing Users

### View Users

1. Go to **Users** in the sidebar
2. See all user accounts
3. View status, groups, 2FA status

### Create User

1. Click **Add User**
2. Enter:
   - Email address
   - Name
   - Password
   - Group assignment
3. Save

### Edit User

1. Click on a user
2. Modify:
   - Name
   - Email
   - Group assignment
3. Save

### Delete User

1. Click user's menu (⋮)
2. Select **Delete**
3. Confirm deletion

::: danger Cannot Undo
User deletion is permanent. The user loses access immediately.
:::

## User Properties

| Property | Description |
| :--- | :--- |
| **Email** | Login identifier, must be unique |
| **Name** | Display name |
| **Password** | Login password |
| **Group** | Permission group |
| **2FA Status** | Whether TOTP is enabled |
| **Created** | Account creation date |
| **Last Login** | Most recent login |

## Authentication

### Password Login

Standard email/password authentication:
- Passwords are hashed with bcrypt
- No password complexity requirements enforced
- Users can change their own passwords

### Two-Factor Authentication (2FA)

Users can enable TOTP-based 2FA:
1. Go to **Profile** → **Security**
2. Click **Enable 2FA**
3. Scan QR code with authenticator app
4. Enter verification code
5. Save recovery codes

### Passkeys (WebAuthn)

Hardware security key or biometric:
1. Go to **Profile** → **Security**
2. Click **Add Passkey**
3. Follow browser prompts
4. Name the passkey

### SSO/OIDC

See [SSO/OIDC](/user-guide/admin/sso) for enterprise authentication.

## Admin Actions

### Reset 2FA

If user loses their 2FA device:
1. Admin edits user
2. Click **Reset 2FA**
3. User can re-enroll

### Reset Password

1. Admin edits user
2. Click **Reset Password**
3. Enter new password
4. User can change after login

### Change Group

1. Admin edits user
2. Select different group
3. Permissions change immediately

## User Profiles

Users can manage their own:
- Display name
- Email (if permitted)
- Password
- 2FA settings
- Passkeys
- Avatar

Located in **Profile** section after clicking user avatar.

## Audit Logging

User actions are logged:
- Login attempts
- Permission changes
- Account modifications

View in **Settings** → **Audit Log**.

## Best Practices

### Account Security

1. **Enable 2FA** for all users
2. **Use strong passwords**
3. **Limit admin accounts**
4. **Regular access reviews**

### Permissions

1. **Least privilege** - Give minimum needed
2. **Group-based** - Avoid individual permissions
3. **Document access** - Know who has what

### Offboarding

When users leave:
1. Delete or disable account
2. Review their group's access
3. Rotate shared secrets if needed

## Troubleshooting

### Can't Login

**Check**:
1. Email is correct
2. Password is correct
3. 2FA code is current (30-second window)
4. Account isn't disabled

### 2FA Not Working

**Causes**:
- Clock sync issues
- Wrong authenticator app
- Recovery codes used

**Solutions**:
1. Check device time is synced
2. Admin can reset 2FA
3. Use recovery code

### Permissions Not Working

**Check**:
1. User is in correct group
2. Group has required permission
3. Cache might need refresh (re-login)

## Next Steps

- [Groups & Permissions](/user-guide/admin/permissions) - Configure access
- [SSO/OIDC](/user-guide/admin/sso) - Enterprise authentication
