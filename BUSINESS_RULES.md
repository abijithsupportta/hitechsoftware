# Hi Tech Software — Business Rules Reference
## Read this before implementing any business logic

---

## GST Rules
- MRP is ALWAYS inclusive of 18% GST — never exclusive
- Base price = MRP / 1.18 — always this formula
- GST amount = MRP - base_price
- Discount applied on MRP FIRST then GST is split
- Discounted base = discounted_mrp / 1.18
- Never calculate GST any other way
- GST rate is always 18% — never configurable
- All monetary values rounded to 2 decimal places

Example:
  MRP = ₹200
  Discount 10% = ₹20
  Discounted MRP = ₹180
  Base price = ₹180 / 1.18 = ₹152.54
  GST = ₹180 - ₹152.54 = ₹27.46
  Line total = ₹180 × quantity

---

## Subject Status Flow
pending → allocated → accepted → arrived →
in_progress → completed
Also valid: incomplete, awaiting_parts,
rescheduled, cancelled
ALL STATUS VALUES LOWERCASE ALWAYS

---

## Billing Rules
- Technician CANNOT give discount — blocked at
  service layer not just UI
- Only office_staff and super_admin can set discounts
- Selling price CANNOT be below MRP — hard block
- Technician CAN charge above MRP — extra is tracked
- Extra price collected = charged_price - MRP × qty
- Bill locked after marked as paid — no edits
- Visit charge and service charge also split by 1.18
  for GST breakdown
- Bill billed to brand/dealer when active AMC detected

---

## AMC Rules
- AMC is per appliance — one AC = one AMC
- ONE active AMC per customer per appliance per brand
- New AMC starts day after previous one ends
- AMC duration: 1yr, 2yr, 3yr, or custom dates
- AMC service is FREE — billed to brand or dealer
- When subject created with active AMC → popup →
  auto-switch billing to brand/dealer
- Notification intervals: 30 days, 15 days,
  7 days, 1 day before expiry
- Contract number format: AMC-YYYY-NNNN

---

## Digital Bag Rules
- Max 50 items total quantity per technician per day
- One session per technician per day only
- Stock reduces IMMEDIATELY when item added to bag
- Stock returns IMMEDIATELY when item removed
- Stock returns when session closed for unused items
- Damage fee defaults to MRP — staff can change
- Damage fees auto-deduct from technician payout
- Session locked after close — read only forever
- Only office_staff and super_admin create/close sessions

---

## Commission Rules
- ALL commission amounts are MANUAL flat amounts
- No percentages — everything is flat rupee amounts
- Three commission types per job:
  1. Service commission — for completing the job
  2. Parts commission — flat for all parts sold on job
  3. Extra price commission — from amount above MRP
- Extra collected is AUTO-CALCULATED by trigger
- Commission on extra is MANUAL — staff decides
- Net earnings = service + parts + extra - variance
- Commission only set AFTER job is completed
- Only office_staff and super_admin set commission
- AMC commission also manual flat amount

---

## Payout Rules
- Payout amount set MANUALLY after job completion
- Cannot mark as paid without setting amount first
- Variance deduction is AUTOMATIC from bag closing
- Damage fees AUTO-DEDUCT from payout
- Payout per service not per month
- Each job has its own payout record

---

## Inventory and Stock Rules
- WAC updates automatically on every stock entry
- WAC resets to new purchase price if stock was zero
- MRP updates automatically from latest stock entry
- Purchase price is GST EXCLUDED
- MRP is GST INCLUDED
- Refurbished items flagged with is_refurbished
- Refurbished needs condition: good, fair, poor
- Stock reduces immediately when added to bag
- current_stock_levels view = received - issued

---

## Attendance Rules
- Must toggle ON before 10:30 AM
- Auto OFF at midnight via cron
- Cannot mark attendance for past dates

---

## Subject Number Rules
- Unique per BRAND or per DEALER — not globally unique
- Different brands can have same subject numbers
- Subject number generated per brand/dealer sequence

---

## Role Permissions Quick Reference
super_admin     → everything
office_staff    → subjects, customers, billing,
                  discounts, commissions, AMC,
                  close bag sessions
stock_manager   → inventory, stock entries,
                  digital bag issue
technician      → own jobs only, sell AMC,
                  view own earnings and leaderboard

---

## RLS Rules
- Migrations 017+ use get_my_role() function
- Before 017 use current_user_role()
- NEVER change old migrations
- If data not returning → check RLS first
- API routes MUST use server.ts client not client.ts

---

## Notification Rules (Fast2SMS)
- AMC expiry: 30, 15, 7, 1 days before
- Each interval sent once — flagged in DB
- Daily cron at 9 AM IST = 3:30 AM UTC
- WhatsApp via Fast2SMS API

---

## Financial Calculation Order
ALWAYS in this order:
1. Start with MRP (inclusive GST)
2. Apply discount → discounted_mrp
3. Split GST → base_price = discounted_mrp / 1.18
4. Multiply by quantity → line_total
5. Sum all lines → subtotal
6. Add visit charge + service charge
7. Grand total

NEVER calculate in any other order
NEVER calculate in JavaScript — use DB generated columns