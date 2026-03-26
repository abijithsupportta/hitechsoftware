---
trigger: glob
globs: "**/subjects/**,**/service/**,**/billing/**,**/BillingSection*,**/AccessoriesSection*,**/BillCard*,**/BillEditPanel*,**/CommissionSection*,**/job-workflow*,**/BagConsumptionSection*"
---

# Service and Subjects Module — Complete Reference

## Module Location
app/dashboard/subjects/ — subject pages
app/dashboard/service/ — brands, dealers, categories
components/subjects/ — all subject UI components
modules/subjects/ — core business logic
modules/brands/ — brand business logic
modules/dealers/ — dealer business logic
modules/service-categories/ — category logic

## Complete File Map

### Modules Layer
modules/subjects/billing.service.ts — billing logic and GST calculations
modules/subjects/subject.constants.ts — constants and enums
modules/subjects/subject.job-workflow.ts — job workflow state machine
modules/subjects/subject.service.ts — core subject business logic
modules/subjects/subject.types.ts — all TypeScript interfaces
modules/subjects/subject.validation.ts — form validation schemas
modules/brands/brand.service.ts — brand business logic
modules/dealers/dealer.service.ts — dealer business logic
modules/service-categories/service-category.service.ts — category logic

### Repositories Layer
repositories/subject.repository.ts — subject DB operations
repositories/brands.repository.ts — brand DB operations
repositories/dealers.repository.ts — dealer DB operations
repositories/service-categories.repository.ts — category DB operations

### Hooks Layer
hooks/subjects/use-job-workflow.ts — job workflow hooks
hooks/subjects/useBilling.ts — billing hooks
hooks/subjects/useSubjectAssignment.ts — assignment hooks
hooks/subjects/useSubjectDetail.ts — detail hooks
hooks/subjects/useSubjects.ts — list hooks
hooks/subjects/useWorkflow.ts — workflow hooks
hooks/brands/useBrands.ts — brand hooks
hooks/dealers/useDealers.ts — dealer hooks

### Components Layer
components/subjects/AccessoriesSection.tsx — parts and accessories
components/subjects/BillingSection.tsx — billing display and edit
components/subjects/BillCard.tsx — bill display card
components/subjects/BillEditPanel.tsx — bill editing panel
components/subjects/CommissionSection.tsx — commission management
components/subjects/BagConsumptionSection.tsx — digital bag consumption
components/subjects/SubjectForm.tsx — subject creation and edit form
components/subjects/SubjectInfoCard.tsx — subject information display
components/subjects/SubjectStatusBadge.tsx — status badge
components/subjects/SubjectPriorityBadge.tsx — priority badge
components/subjects/ActivityTimeline.tsx — subject activity timeline
components/subjects/job-workflow-section.tsx — job workflow controls
components/subjects/photo-gallery.tsx — photo gallery
components/subjects/cannot-complete-modal.tsx — incomplete job modal
components/subjects/ProductInfoCard.tsx — product info

### Pages Layer
app/dashboard/subjects/page.tsx — subject list
app/dashboard/subjects/new/page.tsx — create subject
app/dashboard/subjects/[id]/page.tsx — subject detail
app/dashboard/subjects/[id]/edit/page.tsx — edit subject
app/dashboard/service/brands/page.tsx — brands list
app/dashboard/service/brands/[id]/page.tsx — brand detail
app/dashboard/service/dealers/page.tsx — dealers list
app/dashboard/service/dealers/[id]/page.tsx — dealer detail
app/dashboard/service/categories/page.tsx — categories list

### API Routes
app/api/subjects/[id]/billing/route.ts — billing operations
app/api/subjects/[id]/photos/route.ts — photo CRUD
app/api/subjects/[id]/photos/upload/route.ts — photo upload
app/api/subjects/[id]/respond/route.ts — technician accept/reject
app/api/subjects/[id]/workflow/route.ts — workflow state transitions

## Subject Status Flow
pending → allocated → accepted → arrived →
in_progress → completed
Also valid transitions:
incomplete, awaiting_parts, rescheduled, cancelled
ALL STATUS VALUES LOWERCASE ALWAYS — never uppercase

## Subject Number Rules
- Unique per brand OR per dealer — not globally unique
- Different brands can have same subject numbers

## Billing Rules — Critical
- MRP always inclusive of 18% GST — never exclusive
- Base price = MRP / 1.18
- GST = MRP minus base_price
- Discount applied on MRP FIRST then GST is split
- Discounted base = discounted_mrp / 1.18
- NEVER calculate totals in JavaScript
- Always use DB generated columns for all calculations
- Generated columns: discount_amount, discounted_mrp,
  base_price, gst_amount, line_total on subject_accessories
- Technician CANNOT give discount — blocked at service layer
- Only office_staff and super_admin set discounts
- Selling price CANNOT go below MRP — hard validation
- Technician CAN charge above MRP — extra tracked auto
- Extra price collected = (unit_price - mrp) × qty via trigger
- Bill locked after marked as paid — no edits ever
- Visit charge and service charge also split by 1.18
- Finish button appears after bill marked as paid
- Finish button moves subject to completed status

## GST Calculation Example
MRP = ₹200, Discount 10%
Discounted MRP = ₹180
Base price = ₹180 / 1.18 = ₹152.54
GST = ₹180 - ₹152.54 = ₹27.46
Line total = ₹180 × quantity

## Job Workflow Rules
- Workflow transitions via API route only
- Never update status directly in repository from UI
- Each transition has validation in subject.job-workflow.ts
- Photos required before completion
  In-warranty: 6 photos plus video mandatory
  Out-of-warranty: 3 photos mandatory
- Incomplete jobs need reason selection

## Commission Rules in Subject Context
- Commission section visible in subject detail page
- Extra price collected shown as read-only auto-calculated
- Service commission, parts commission, extra commission
  all manual flat amounts set by office_staff or super_admin
- Commission section only editable after job completed
- Technician sees read-only view only

## AMC Detection in Subject Creation
- When subject created check active AMC for customer
- Match on customer_id + appliance_category + brand
- If active AMC found show popup modal
- Popup shows contract number, validity, coverage
- Auto-switch billing to brand or dealer from AMC
- Store amc_id on subject record for reference
- If override chosen — store override reason

## Digital Bag Integration
- BagConsumptionSection shows technician bag items
- When technician adds part from bag to job
- Call consume bag item API simultaneously
- Bag quantity reduces immediately via optimistic update
- Rollback if API fails — show error toast
- Remove accessory → returns quantity to bag automatically

## Brand and Dealer Module Rules
- Brands have subjects assigned to them
- Dealers have subjects assigned to them
- Brand detail page shows all subjects for that brand
- Dealer detail page shows all subjects for that dealer
- Financial summaries from materialized views:
  brand_financial_summary, dealer_financial_summary
- Call refresh_financial_summaries after bill payment update

## Key Database Tables
subjects, subject_accessories, subject_bills,
subject_photos, subject_contracts, subject_history,
brands, dealers, service_categories

## Role Permissions for This Module
office_staff — full subject management, billing,
  discounts, commission setting
super_admin — everything
stock_manager — view subjects only
technician — own jobs only, no discounts,
  read-only commission view

## Integration Chain
Subject ↔ Billing ↔ Commission
Subject ↔ Digital Bag ↔ Inventory
Subject ↔ Photos ↔ Workflow
Subject ↔ AMC billing detection
Subject ↔ Brand and Dealer financial summaries