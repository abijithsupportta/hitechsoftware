---
trigger: model_decision
description: Technician module rules — read when working on technician profiles, attendance, performance, commission, earnings, leaderboard, or payout
---

# Technician Module

## Key Files
- app/dashboard/team/ — team management pages
- app/dashboard/leaderboard/ — leaderboard page
- app/dashboard/payouts/ — payout pages
- modules/commission/commission.service.ts
- repositories/commission.repository.ts
- repositories/payout.repository.ts
- hooks/commission/useCommission.ts
- hooks/digital-bag/usePayouts.ts

## Roles
- super_admin — full access
- office_staff — subjects, customers, billing,
  discounts, commissions, AMC, close bag sessions
- stock_manager — inventory, stock, digital bag
- technician — own jobs only, sell AMC,
  view own earnings and leaderboard

## Attendance Rules
- Must toggle ON before 10:30 AM
- Auto OFF at midnight via cron
- Cannot mark attendance for past dates

## Commission Rules — ALL MANUAL FLAT AMOUNTS
No percentages — everything is flat rupee amounts.
Three types per job:
1. Service commission — flat for completing the job
2. Parts commission — flat for all parts sold on job
3. Extra price commission — manual from extra collected
Extra price collected is AUTO-CALCULATED by trigger.
Commission on extra is MANUAL — staff sets it.
Net earnings = service + parts + extra - variance
Only office_staff and super_admin set commission.
Commission only set AFTER job completion.
AMC commission also manual flat amount.

## Payout Rules
- Payout amount set MANUALLY after completion
- Cannot mark paid without setting amount first
- Variance deduction is AUTOMATIC from bag closing
- Damage fees AUTO-DEDUCT from payout
- Payout per service not per month

## Leaderboard
- Daily, Weekly, Monthly tabs
- Ranked by net_earnings descending
- Visible to ALL roles including technicians
- Shows: rank, name, services, parts sold,
  extra collected, AMC sold, net earnings

## Key Tables
profiles, technician_service_payouts,
technician_commission_config,
technician_earnings_summary,
technician_leaderboard (materialized view),
attendance_logs
