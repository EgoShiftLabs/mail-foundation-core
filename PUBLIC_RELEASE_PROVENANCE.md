# Public Release Provenance — $MAIL V1

This public V1 snapshot was exported from the approved $MAIL development
baseline at source commit:

```
a6ef4774f1e954624e46e0cbf5a34f7e00ae3788
```

That commit represents the current approved post-security V1 baseline: the
frozen V1 proof-of-concept application plus the approved governance
documentation and the approved FIX-class security remediations recorded in
[`SECURITY_AUDIT_V1.md`](SECURITY_AUDIT_V1.md) and
[`CHANGE_CONTROL.md`](CHANGE_CONTROL.md).

The hash above is published for technical provenance only: it allows the
maintainers to correlate this public snapshot with the exact private source
state it was exported from.

## Sanitization notes

This repository is a sanitized public snapshot with its own clean history, not
a mirror of the private development repository. Relative to the source commit:

- Internal development materials (working prompts, internal notes, scratch
  assets, development-environment configuration, and an internal preview
  sandbox) were **excluded**. No application source was removed.
- `README.md`, `SECURITY.md`, and this provenance file were **added** for the
  public release.
- Placeholder HTML meta-description text in the web frontend was replaced with
  an accurate product description. No functional code was changed.
- One unused dependency was removed from the root `package.json`, and the
  lockfile was re-pruned accordingly. Application dependencies are unchanged.

No application functionality, wallet authentication behavior, database
behavior, or security control was modified in the preparation of this
snapshot.
