# @repo/sms

OTP delivery for tenant-api customer login.

- Development: logs to the console when Twilio is unset.
- Production US: Twilio (`TWILIO_*`).
- Production KSA (`DATA_REGION=ksa`): Twilio is **blocked**. Use an in-kingdom
  provider before launch.

See [docs/tenant-data-residency.md](../../docs/tenant-data-residency.md).
