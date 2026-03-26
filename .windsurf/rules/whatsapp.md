---
trigger: glob
globs: "**/whatsapp/**,**/amc-notifications*,**/cron/**"
---

# WhatsApp and Notifications Module

## Key Files
- lib/whatsapp/ — all WhatsApp functions
- lib/whatsapp/amc-notifications.ts
- app/api/cron/ — all cron routes
- vercel.json — cron configuration

## Fast2SMS Setup
- Provider: Fast2SMS
- Use existing Fast2SMS configuration
- FAST2SMS_API_KEY in environment variables

## Cron Routes Protection
- All cron routes protected by CRON_SECRET header
- CRON_SECRET in environment variables
- Return 401 if header missing or wrong

## AMC Notification Schedule
- 30 days before: first reminder
- 15 days before: second reminder
- 7 days before: urgent reminder
- 1 day before: final reminder
- Cron: "30 3 * * *" — 9AM IST daily

## Message Format
Keep messages under 160 characters for SMS.
Always include: customer name, contract number,
expiry date, Hi Tech Engineering phone number.
