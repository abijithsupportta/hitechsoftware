# Hi Tech Software - Complete API Documentation

## 🎯 API Overview

This document provides comprehensive documentation for all API endpoints in the Hi Tech Software system. All APIs follow RESTful conventions and consistent response formats.

---

## 📋 API Standards and Conventions

### **Base URL**
```
Production: https://hitechsoftware.vercel.app/api
Development: http://localhost:3000/api
```

### **Response Format**
```typescript
// Success Response
{
  success: true,
  data: T,
  message?: string
}

// Error Response
{
  success: false,
  error: string,
  code: string,
  details?: any
}
```

### **HTTP Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### **Authentication**
All API endpoints use Supabase authentication:
- **Browser**: Cookie-based authentication
- **Mobile**: JWT token in Authorization header
- **Server**: Service role for admin operations

---

## 🔐 Authentication & Authorization

### **Role-Based Access Control**
```typescript
type UserRole = 'super_admin' | 'office_staff' | 'stock_manager' | 'technician';

// Permission Matrix
const permissions = {
  super_admin: ['*'], // Full access
  office_staff: ['customers', 'subjects', 'billing', 'amc'],
  stock_manager: ['inventory', 'stock_entries', 'suppliers'],
  technician: ['own_subjects', 'own_bag', 'own_earnings']
};
```

### **Auth Headers**
```http
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

---

## 👥 USER MANAGEMENT APIS

### **GET /api/health**
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-27T02:30:00Z",
    "version": "1.0.0"
  }
}
```

---

## 🛠️ SERVICE MANAGEMENT APIS

### **Subjects / Service Tickets**

#### **GET /api/subjects**
List all subjects (filtered by user role and permissions).

**Query Parameters:**
```typescript
{
  page?: number;        // Pagination (default: 1)
  limit?: number;       // Items per page (default: 20)
  status?: string;      // Filter by status
  customer_id?: string; // Filter by customer
  technician_id?: string; // Filter by technician
  search?: string;      // Search in subject_number, customer_name
  from_date?: string;   // Filter by date range
  to_date?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "id": "uuid",
        "subject_number": "SUB-2026-001",
        "customer": {
          "id": "uuid",
          "customer_name": "John Doe",
          "phone_number": "+919876543210"
        },
        "product_name": "Washing Machine",
        "status": "in_progress",
        "priority": "normal",
        "assigned_technician": {
          "id": "uuid",
          "display_name": "Tech User",
          "phone_number": "+919876543211"
        },
        "created_at": "2026-03-27T02:30:00Z",
        "updated_at": "2026-03-27T02:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 236,
      "totalPages": 12
    }
  }
}
```

#### **GET /api/subjects/[id]**
Get details of a specific subject.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject_number": "SUB-2026-001",
    "customer": {
      "id": "uuid",
      "customer_name": "John Doe",
      "phone_number": "+919876543210",
      "email": "john@example.com",
      "address": "123 Main St, City",
      "latitude": 9.9674,
      "longitude": 76.2488
    },
    "product_name": "Washing Machine",
    "product_description": "Front load washing machine",
    "product_model": "WM-2000",
    "product_serial_number": "SN123456",
    "category_name": "Washing Machine",
    "type_of_service": "Repair",
    "priority": "normal",
    "status": "in_progress",
    "warranty_end_date": "2026-12-31",
    "assigned_technician": {
      "id": "uuid",
      "display_name": "Tech User",
      "phone_number": "+919876543211"
    },
    "technician_acceptance_status": "accepted",
    "technician_allocated_date": "2026-03-27",
    "is_amc_service": false,
    "amc_contract": null,
    "is_warranty_service": true,
    "completed_at": null,
    "status_history": [
      {
        "status": "pending",
        "changed_by": "Staff User",
        "changed_at": "2026-03-27T02:30:00Z",
        "notes": "Initial request"
      }
    ],
    "photos": [
      {
        "id": "uuid",
        "photo_url": "https://storage.url/photo.jpg",
        "photo_type": "before",
        "uploaded_by": "Tech User",
        "uploaded_at": "2026-03-27T02:30:00Z"
      }
    ],
    "bill": {
      "id": "uuid",
      "bill_number": "BILL-2026-001",
      "visit_charge": 150.00,
      "service_charge": 500.00,
      "accessories_total": 1200.00,
      "gst_amount": 370.00,
      "grand_total": 2220.00,
      "payment_status": "due"
    },
    "created_at": "2026-03-27T02:30:00Z",
    "updated_at": "2026-03-27T02:30:00Z"
  }
}
```

#### **POST /api/subjects**
Create a new service ticket.

**Request Body:**
```typescript
{
  customer_id: string;
  product_name: string;
  product_description?: string;
  product_model?: string;
  product_serial_number?: string;
  category_name?: string;
  type_of_service?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  warranty_end_date?: string;
  notes?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject_number": "SUB-2026-002",
    "status": "pending",
    "created_at": "2026-03-27T02:30:00Z"
  },
  "message": "Service ticket created successfully"
}
```

#### **PUT /api/subjects/[id]**
Update subject details.

**Request Body:**
```typescript
{
  product_name?: string;
  product_description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}
```

#### **POST /api/subjects/[id]/workflow**
Update subject status (workflow transitions).

**Request Body:**
```typescript
{
  status: 'allocated' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'incomplete' | 'awaiting_parts' | 'reschedule' | 'cancelled';
  notes?: string;
  technician_id?: string; // For allocation
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "updated_at": "2026-03-27T02:30:00Z"
  },
  "message": "Status updated successfully"
}
```

#### **POST /api/subjects/[id]/respond**
Technician response to assignment (accept/reject).

**Request Body:**
```typescript
{
  action: 'accept' | 'reject';
  notes?: string;
  reschedule_date?: string; // For rejection with reschedule
}
```

---

## 📸 PHOTOS MANAGEMENT APIS

### **POST /api/subjects/[id]/photos/upload**
Upload photo for a subject.

**Request:** `multipart/form-data`
- `photo`: Image file (jpg, png, webp)
- `photo_type`: 'before' | 'after' | 'during' | 'document'
- `notes`: Optional notes about the photo

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "photo_url": "https://storage.url/photo.jpg",
    "photo_type": "before",
    "uploaded_at": "2026-03-27T02:30:00Z"
  },
  "message": "Photo uploaded successfully"
}
```

### **GET /api/subjects/[id]/photos**
Get all photos for a subject.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "photo_url": "https://storage.url/photo.jpg",
      "photo_type": "before",
      "notes": "Initial condition",
      "uploaded_by": "Tech User",
      "uploaded_at": "2026-03-27T02:30:00Z"
    }
  ]
}
```

### **DELETE /api/subjects/[id]/photos/[photoId]**
Delete a photo.

---

## 💰 BILLING APIS

### **GET /api/subjects/[id]/billing**
Get billing details for a subject.

**Response:**
```json
{
  "success": true,
  "data": {
    "bill": {
      "id": "uuid",
      "bill_number": "BILL-2026-001",
      "visit_charge": 150.00,
      "service_charge": 500.00,
      "accessories_total": 1200.00,
      "gst_amount": 370.00,
      "grand_total": 2220.00,
      "payment_status": "due",
      "payment_mode": null,
      "payment_collected_at": null,
      "created_at": "2026-03-27T02:30:00Z"
    },
    "accessories": [
      {
        "id": "uuid",
        "item_name": "Motor",
        "quantity": 1,
        "unit_price": 1000.00,
        "total_price": 1000.00,
        "extra_price_collected": 200.00
      }
    ]
  }
}
```

### **POST /api/subjects/[id]/billing**
Create or update bill for a subject.

**Request Body:**
```typescript
{
  visit_charge?: number;
  service_charge?: number;
  payment_mode?: 'cash' | 'card' | 'upi' | 'bank_transfer';
  accessories?: [
    {
      item_name: string;
      quantity: number;
      unit_price: number;
      extra_price_collected?: number;
    }
  ];
}
```

### **PUT /api/bills/[id]/edit**
Edit existing bill.

### **GET /api/bills/[id]/download**
Download PDF bill.

**Response:** PDF file download

---

## 🎁 COMMISSION APIS

### **GET /api/commission/[subjectId]**
Get commission details for a subject.

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "id": "uuid",
      "service_commission": 100.00,
      "parts_commission": 50.00,
      "extra_price_commission": 25.00,
      "commission_notes": "Standard rates"
    },
    "earnings": {
      "id": "uuid",
      "service_commission": 100.00,
      "parts_commission": 50.00,
      "extra_price_commission": 25.00,
      "extra_price_collected": 200.00,
      "variance_deduction": 0.00,
      "net_earnings": 175.00,
      "earnings_status": "pending"
    }
  }
}
```

### **POST /api/commission/[subjectId]**
Set or update commission for a subject.

**Request Body:**
```typescript
{
  service_commission: number;
  parts_commission: number;
  extra_price_commission: number;
  commission_notes?: string;
}
```

---

## 👥 TEAM MANAGEMENT APIS

### **GET /api/team/members**
Get all team members (filtered by role).

**Query Parameters:**
```typescript
{
  role?: 'super_admin' | 'office_staff' | 'stock_manager' | 'technician';
  is_active?: boolean;
  search?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "display_name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+919876543210",
      "role": "technician",
      "is_active": true,
      "technician": {
        "technician_code": "TECH001",
        "qualification": "Diploma",
        "experience_years": 5,
        "daily_subject_limit": 10,
        "digital_bag_capacity": 50,
        "total_rejections": 2
      },
      "performance": {
        "total_completed": 45,
        "this_month_completed": 12,
        "average_rating": 4.5,
        "total_earnings": 15000.00
      }
    }
  ]
}
```

### **POST /api/team/members**
Create new team member.

**Request Body:**
```typescript
{
  email: string;
  display_name: string;
  phone_number: string;
  role: UserRole;
  technician?: {
    technician_code: string;
    qualification: string;
    experience_years?: number;
    bank_account_number?: string;
    bank_name?: string;
    ifsc_code?: string;
  };
}
```

### **GET /api/team/members/[id]**
Get specific team member details.

### **PUT /api/team/members/[id]**
Update team member.

### **GET /api/team/members/[id]/performance**
Get performance statistics for a team member.

**Response:**
```json
{
  "success": true,
  "data": {
    "technician_id": "uuid",
    "period": "2026-03",
    "total_completed": 12,
    "total_revenue": 15000.00,
    "total_earnings": 3000.00,
    "average_completion_time": 2.5, // hours
    "customer_rating": 4.5,
    "on_time_completion_rate": 0.92,
    "monthly_ranking": 3
  }
}
```

---

## 📦 INVENTORY APIS

### **GET /api/products**
Search products (for digital bag and billing).

**Query Parameters:**
```typescript
{
  search?: string;
  category_id?: string;
  product_type_id?: string;
  brand?: string;
  is_active?: boolean;
  limit?: number;
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "material_code": "MAT001",
      "product_name": "Washing Machine Motor",
      "description": "High efficiency motor",
      "category_name": "Motors",
      "product_type": "Electrical",
      "brand": "LG",
      "mrp": 1500.00,
      "current_stock": 25,
      "wac": 1200.00, // Weighted Average Cost
      "uom": "Piece"
    }
  ]
}
```

### **POST /api/products**
Create new product (stock_manager only).

**Request Body:**
```typescript
{
  material_code: string;
  product_name: string;
  description?: string;
  category_id: string;
  product_type_id: string;
  brand?: string;
  hsn_sac_code?: string;
  purchase_price: number;
  mrp: number;
  uom?: string;
}
```

---

## 🎒 DIGITAL BAG APIS

### **GET /api/digital-bag/[technicianId]**
Get current digital bag for technician.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "session_date": "2026-03-27",
      "status": "active",
      "items_issued": 15,
      "items_returned": 5,
      "items_consumed": 3,
      "variance_amount": 0.00,
      "started_at": "2026-03-27T08:00:00Z"
    },
    "items": [
      {
        "id": "uuid",
        "product": {
          "id": "uuid",
          "material_code": "MAT001",
          "product_name": "Washing Machine Motor",
          "mrp": 1500.00
        },
        "quantity_issued": 5,
        "quantity_returned": 2,
        "quantity_consumed": 1,
        "notes": "Used for job SUB-001"
      }
    ]
  }
}
```

### **POST /api/digital-bag/consume**
Record consumption of items from digital bag.

**Request Body:**
```typescript
{
  session_id: string;
  consumptions: [
    {
      item_id: string;
      quantity_consumed: number;
      subject_id: string;
      notes?: string;
    }
  ];
}
```

### **POST /api/digital-bag/return**
Return items to digital bag.

**Request Body:**
```typescript
{
  session_id: string;
  returns: [
    {
      item_id: string;
      quantity_returned: number;
      notes?: string;
    }
  ];
}
```

---

## 🤝 AMC (Annual Maintenance Contracts) APIS

### **GET /api/amc**
Get all AMC contracts.

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  status?: 'active' | 'expiring_soon' | 'expired' | 'renewed' | 'cancelled';
  customer_id?: string;
  search?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": "uuid",
        "contract_number": "AMC-2026-001",
        "customer": {
          "id": "uuid",
          "customer_name": "John Doe"
        },
        "appliance_brand": "LG",
        "appliance_model": "WM-2000",
        "duration_type": "1_year",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
        "status": "active",
        "price_paid": 5000.00,
        "coverage_description": "Annual maintenance including parts and labor",
        "free_visits_per_year": 4,
        "parts_covered": true,
        "parts_coverage_limit": 2000.00,
        "days_until_expiry": 279
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### **POST /api/amc**
Create new AMC contract.

**Request Body:**
```typescript
{
  customer_id: string;
  appliance_category_id: string;
  appliance_brand: string;
  appliance_model?: string;
  appliance_serial_number?: string;
  duration_type: '1_year' | '2_years' | '3_years';
  start_date: string;
  end_date: string;
  price_paid: number;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer';
  billed_to_type: 'customer' | 'dealer' | 'brand';
  billed_to_id?: string;
  sold_by: string;
  coverage_description: string;
  free_visits_per_year: number;
  parts_covered: boolean;
  parts_coverage_limit?: number;
  brands_covered?: string;
  exclusions?: string;
  special_terms?: string;
}
```

### **GET /api/amc/[id]**
Get specific AMC contract details.

### **PUT /api/amc/[id]**
Update AMC contract.

### **POST /api/amc/[id]/renew**
Renew AMC contract.

**Request Body:**
```typescript
{
  duration_type: '1_year' | '2_years' | '3_years';
  start_date: string;
  end_date: string;
  price_paid: number;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer';
  coverage_description?: string;
  free_visits_per_year?: number;
  parts_covered?: boolean;
  parts_coverage_limit?: number;
}
```

### **POST /api/amc/[id]/commission**
Set commission for AMC sale.

**Request Body:**
```typescript
{
  commission_amount: number;
  commission_notes?: string;
}
```

---

## ⏰ ATTENDANCE APIS

### **POST /api/attendance/toggle**
Toggle attendance for current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "attendance_date": "2026-03-27",
    "check_in_time": "08:30:00",
    "check_out_time": null,
    "status": "present",
    "total_hours": null
  },
  "message": "Check-in successful"
}
```

---

## 📊 DASHBOARD APIS

### **GET /api/dashboard/technician/completed-summary**
Get completed subjects summary for technician dashboard.

**Query Parameters:**
```typescript
{
  technician_id?: string; // Optional, defaults to current user
  period?: 'today' | 'week' | 'month' | 'year';
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "today",
    "total_completed": 3,
    "total_revenue": 2500.00,
    "average_completion_time": 2.5,
    "customer_rating": 4.5,
    "subjects": [
      {
        "id": "uuid",
        "subject_number": "SUB-001",
        "customer_name": "John Doe",
        "completed_at": "2026-03-27T14:30:00Z",
        "total_amount": 800.00,
        "completion_time": 2.0
      }
    ]
  }
}
```

---

## 🔔 NOTIFICATION APIS

### **GET /api/notifications**
Get notifications for current user.

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  read?: boolean; // Filter by read status
  type?: string; // Filter by notification type
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "New Service Assignment",
        "message": "You have been assigned to service ticket SUB-001",
        "type": "assignment",
        "read": false,
        "created_at": "2026-03-27T02:30:00Z",
        "data": {
          "subject_id": "uuid",
          "subject_number": "SUB-001"
        }
      }
    ],
    "unread_count": 5
  }
}
```

### **PUT /api/notifications/[id]/read**
Mark notification as read.

---

## 🚨 ERROR HANDLING

### **Common Error Responses**

#### **Validation Error (400)**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "customer_id",
    "message": "Customer is required"
  }
}
```

#### **Permission Error (403)**
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "PERMISSION_DENIED",
  "details": "You don't have permission to perform this action"
}
```

#### **Not Found Error (404)**
```json
{
  "success": false,
  "error": "Resource not found",
  "code": "NOT_FOUND",
  "details": "Subject with ID 'uuid' not found"
}
```

#### **Database Error (500)**
```json
{
  "success": false,
  "error": "Database operation failed",
  "code": "DATABASE_ERROR",
  "details": "Connection timeout"
}
```

---

## 📱 MOBILE APP SPECIFIC CONSIDERATIONS

### **Authentication for Mobile**
```http
Authorization: Bearer <supabase_jwt_token>
```

### **Pagination for Mobile**
All list endpoints support pagination:
```typescript
{
  page: 1,
  limit: 20,
  total: 236,
  totalPages: 12,
  hasNext: true,
  hasPrev: false
}
```

### **Offline Support**
- Include `updated_at` timestamps for caching
- Provide `ETag` headers for conditional requests
- Use optimistic updates where appropriate

---

## 🔧 API TESTING

### **Testing Endpoints**
```bash
# Health check
curl http://localhost:3000/api/health

# Get subjects (with auth)
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/subjects?limit=10

# Create subject
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"customer_id":"uuid","product_name":"Test"}' \
     http://localhost:3000/api/subjects
```

### **Response Time Expectations**
- **Health Check**: < 100ms
- **List Endpoints**: < 500ms
- **Detail Endpoints**: < 300ms
- **Create/Update**: < 800ms
- **File Upload**: < 2000ms

---

## 📋 API CHANGE LOG

### **Version 1.0.0** (Current)
- ✅ All core service management APIs
- ✅ Billing and commission APIs
- ✅ Team management APIs
- ✅ Inventory and digital bag APIs
- ✅ AMC management APIs
- ✅ Attendance and notification APIs

### **Planned for Future Versions**
- 🔄 WhatsApp notification APIs
- 🔄 Advanced reporting APIs
- 🔄 Analytics and insights APIs
- 🔄 Integration APIs for external systems

---

## 🎯 BEST PRACTICES

### **For API Consumers**
1. **Always check `success` field** before accessing `data`
2. **Handle error responses** gracefully
3. **Use appropriate HTTP methods** (GET for read, POST for create, PUT for update)
4. **Include proper authentication** headers
5. **Validate input data** before sending
6. **Implement retry logic** for network failures
7. **Cache responses** appropriately using timestamps

### **Rate Limiting**
- **Anonymous requests**: 100/hour
- **Authenticated requests**: 1000/hour
- **Admin operations**: 500/hour

### **Data Validation**
- All inputs are validated using Zod schemas
- Dates must be in ISO 8601 format
- Monetary values should have 2 decimal places
- UUIDs must be valid UUID v4 format

---

This API documentation provides complete information for integrating with the Hi Tech Software system. All endpoints are designed to be RESTful, consistent, and well-documented for easy integration by web and mobile applications.
