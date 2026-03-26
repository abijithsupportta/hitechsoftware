---
trigger: glob
globs: "**/digital-bag/**,**/my-bag/**,**/BagProductSearch*,**/useDigitalBag*"
---

# Digital Bag Module

## Key Files
- app/dashboard/digital-bag/ — admin bag pages
- app/dashboard/my-bag/ — technician bag view
- components/digital-bag/BagProductSearch.tsx
- modules/digital-bag/digital-bag.service.ts
- modules/digital-bag/payout.service.ts
- repositories/digital-bag.repository.ts
- repositories/payout.repository.ts
- hooks/digital-bag/useDigitalBag.ts
- hooks/digital-bag/usePayouts.ts

## Session Rules
- One session per technician per day — hard constraint
- Max 50 items TOTAL QUANTITY per session
- Session editable until 11:59 PM same day
- After midnight — session must be closed
- Closed session is READ ONLY FOREVER — no exceptions
- Only office_staff and super_admin create sessions
- Only office_staff and super_admin close sessions
- Technician can only VIEW their own bag

## Stock Rules — Critical
- Stock reduces IMMEDIATELY when item added to bag
  via issue_bag_item database function
- Stock returns IMMEDIATELY when item removed
  via remove_bag_item database function
- Stock returns on session close for unused items
- Optimistic updates in UI for instant feedback
- Rollback if API call fails

## Product Search in Bag
- Click search → show first 5 products immediately
- Only products with current_quantity > 0 shown
- Search by material code, name, or description
- If product already in bag → show existing quantity
  allow quantity edit only — no duplicate rows
- Hard block if requested quantity exceeds stock
  Error: "Only X units available in stock"

## Close Session Flow
- Staff checks each item with checkbox
- Unchecked items = missing/damaged
- Damage fee defaults to MRP — staff can edit
- Missing items auto-deduct from payout
- All returned items go back to stock
- Session status → closed after confirm

## Key Tables
digital_bag_sessions, digital_bag_items,
digital_bag_consumptions, technician_service_payouts

## Database Functions
issue_bag_item — validates and issues item
remove_bag_item — removes and returns stock
close_bag_session — closes with damage calculation
