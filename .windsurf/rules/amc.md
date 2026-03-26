---
trigger: model_decision
description: AMC module rules — read when working on AMC contracts, renewals, expiry notifications, or AMC billing detection
---

# AMC Module

## Key Files
- app/dashboard/amc/ — all AMC pages
- modules/amc/amc.service.ts
- modules/amc/amc.types.ts
- repositories/amc.repository.ts
- hooks/amc/useAMC.ts
- lib/whatsapp/amc-notifications.ts
- app/api/cron/amc-notifications/route.ts

## Migration: 031 — Next: 032

## Core Rules
- AMC is per appliance — one AC = one AMC
- One active AMC per customer per appliance per brand
- New AMC starts day AFTER previous one ends
- No overlapping AMCs — unique partial index enforced
- AMC service is FREE — billed to brand or dealer
- Duration: 1yr, 2yr, 3yr, or custom dates
- Contract number format: AMC-YYYY-NNNN

## Selling Rules
- Technicians and office staff can sell AMC
- Payment: cash on spot or office invoice
- Commission is manual flat amount — set after sale
- AMC commission linked to technician_earnings_summary

## Subject Integration
- When subject created → check active AMC
- If active AMC found → show popup
- Auto-switch billing to brand or dealer
- Store amc_id on subject record

## Notification Rules via Fast2SMS
- 30 days before expiry — first reminder
- 15 days before expiry — second reminder
- 7 days before expiry — urgent reminder
- 1 day before expiry — final reminder
- Each notification sent ONCE — flagged in DB
- Cron runs daily at 9AM IST = 3:30 AM UTC
- vercel.json cron schedule: "30 3 * * *"

## Key Tables
amc_contracts, amc notification flags on contract

## AMC Status Values
pending, active, expired, cancelled
