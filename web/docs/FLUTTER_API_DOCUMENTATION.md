# Hi Tech Software - Flutter API Documentation

**Complete API reference for Flutter mobile applications development**
- **hitech_admin** (Flutter Admin App)
- **hitech_technician** (Flutter Technician App)

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Common Headers & Responses](#common-headers--responses)
4. [Core Endpoints](#core-endpoints)
5. [AMC Module](#amc-module)
6. [Commission Module](#commission-module)
7. [Digital Bag Module](#digital-bag-module)
8. [Team Management](#team-management)
9. [Subjects & Workflow](#subjects--workflow)
10. [Billing & Payments](#billing--payments)
11. [Attendance](#attendance)
12. [Products & Inventory](#products--inventory)
13. [Media & Documents](#media--documents)
14. [Error Handling](#error-handling)
15. [Flutter Integration Guide](#flutter-integration-guide)

---

## 🌐 API Overview

### Base URLs
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### Authentication
- **Method**: Supabase Session-based (Cookie + Bearer Token)
- **Flow**: Login → Get Session → Use for API calls
- **Token Refresh**: Automatic via Supabase client

### Rate Limits
- **Standard**: 100 requests/minute
- **Upload**: 10 requests/minute
- **Auth**: 5 requests/minute

---

## 🔐 Authentication

### Login
```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "technician@hitech.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "technician@hitech.com",
    "user_metadata": {
      "role": "technician",
      "display_name": "John Doe"
    }
  }
}
```

### Get Current User
```http
GET /auth/v1/user
Authorization: Bearer <access_token>
```

### Logout
```http
POST /auth/v1/logout
Authorization: Bearer <access_token>
```

---

## 📦 Common Headers & Responses

### Required Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
X-Client-Platform: hitech_admin | hitech_technician
X-App-Version: 1.0.0
X-Timezone: Asia/Kolkata
```

### Success Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2026-03-27T12:00:00.000Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "phone_number",
        "message": "Invalid phone format"
      }
    ]
  },
  "timestamp": "2026-03-27T12:00:00.000Z"
}
```

---

## 🎯 Core Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-27T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 📋 AMC Module

### Get AMC Contracts
```http
GET /api/amc?status=active&page=1&pageSize=20
Authorization: Bearer <token>
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
        "customer_id": "uuid",
        "customer_name": "John Doe",
        "customer_phone": "+919876543210",
        "appliance_category_id": "uuid",
        "appliance_category_name": "Air Conditioner",
        "appliance_brand": "LG",
        "appliance_model": "LS-Q18YNZA",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
        "status": "active",
        "price_paid": 5000.00,
        "payment_mode": "cash",
        "days_until_expiry": 279,
        "is_expiring_soon": false
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### Get AMC Details
```http
GET /api/amc/{id}
Authorization: Bearer <token>
```

### Create AMC Contract
```http
POST /api/amc
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "uuid",
  "appliance_category_id": "uuid",
  "appliance_brand": "LG",
  "appliance_model": "LS-Q18YNZA",
  "appliance_serial_number": "SN123456789",
  "duration_type": "1_year",
  "start_date": "2026-03-27",
  "price_paid": 5000.00,
  "payment_mode": "cash",
  "billed_to_type": "brand",
  "billed_to_id": "uuid",
  "sold_by": "uuid",
  "coverage_description": "Comprehensive coverage",
  "free_visits_per_year": 4,
  "parts_covered": true,
  "parts_coverage_limit": 10000.00
}
```

### Renew AMC Contract
```http
POST /api/amc/{id}/renew
Authorization: Bearer <token>
Content-Type: application/json

{
  "duration_type": "1_year",
  "start_date": "2027-01-01",
  "price_paid": 5500.00,
  "payment_mode": "cash",
  "billed_to_type": "brand",
  "billed_to_id": "uuid",
  "sold_by": "uuid",
  "coverage_description": "Comprehensive coverage",
  "free_visits_per_year": 4,
  "parts_covered": true,
  "parts_coverage_limit": 11000.00
}
```

### Set AMC Commission
```http
POST /api/amc/{id}/commission
Authorization: Bearer <token>
Content-Type: application/json

{
  "commission_amount": 500.00
}
```

---

## 💰 Commission Module

### Get Technician Earnings
```http
GET /api/commission/technician/{technicianId}?period=monthly&page=1&pageSize=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "earnings": [
      {
        "id": "uuid",
        "subject_id": "uuid",
        "subject_number": "SUB-2026-001",
        "service_commission": 200.00,
        "parts_commission": 150.00,
        "extra_price_commission": 50.00,
        "variance_deduction": 0.00,
        "net_earnings": 400.00,
        "total_bill_value": 2000.00,
        "parts_sold_value": 800.00,
        "earnings_status": "confirmed",
        "created_at": "2026-03-27T12:00:00.000Z"
      }
    ],
    "summary": {
      "total_services": 12,
      "total_bill_value": 24000.00,
      "total_earnings": 4800.00,
      "pending_earnings": 800.00,
      "confirmed_earnings": 4000.00
    },
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

### Get Subject Commission
```http
GET /api/commission/{subjectId}
Authorization: Bearer <token>
```

### Set Subject Commission
```http
POST /api/commission/{subjectId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "service_commission": 200.00,
  "parts_commission": 150.00,
  "extra_price_commission": 50.00,
  "commission_notes": "Excellent service"
}
```

---

## 🎒 Digital Bag Module

### Get Bag Summary
```http
GET /api/digital-bag/summary?technicianId={technicianId}&date=2026-03-27
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "technician_id": "uuid",
    "date": "2026-03-27",
    "capacity_used": 25,
    "capacity_total": 50,
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "material_code": "AC-FILT-001",
        "product_name": "AC Filter",
        "quantity_issued": 5,
        "quantity_returned": 2,
        "quantity_consumed": 3
      }
    ],
    "status": "active"
  }
}
```

### Consume Bag Item
```http
POST /api/digital-bag/consume
Authorization: Bearer <token>
Content-Type: application/json

{
  "bag_item_id": "uuid",
  "subject_id": "uuid",
  "quantity": 2,
  "notes": "Used for AC repair"
}
```

### Return Bag Items
```http
POST /api/digital-bag/return
Authorization: Bearer <token>
Content-Type: application/json

{
  "returns": [
    {
      "bag_item_id": "uuid",
      "quantity_returned": 3,
      "notes": "Unused items returned"
    }
  ]
}
```

---

## 👥 Team Management

### Get Team Members
```http
GET /api/team/members?role=technician&is_active=true&page=1&pageSize=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "uuid",
        "email": "technician@hitech.com",
        "display_name": "John Doe",
        "phone_number": "+919876543210",
        "role": "technician",
        "is_active": true,
        "technician": {
          "id": "uuid",
          "technician_code": "TECH-001",
          "qualification": "Diploma in Electronics",
          "experience_years": 5,
          "daily_subject_limit": 10,
          "digital_bag_capacity": 50
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

### Create Team Member
```http
POST /api/team/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newtechnician@hitech.com",
  "password": "password123",
  "display_name": "Jane Smith",
  "phone_number": "+919876543211",
  "role": "technician",
  "technician": {
    "technician_code": "TECH-002",
    "qualification": "B.Tech Electronics",
    "experience_years": 3,
    "daily_subject_limit": 8
  }
}
```

### Get Member Performance
```http
GET /api/team/members/{id}/performance?months=6
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "monthly": [
      {
        "month": "2026-03",
        "label": "Mar 2026",
        "completed": 12,
        "rejections": 1,
        "reschedules": 2
      }
    ],
    "totals": {
      "completed_last_6_months": 72,
      "completed_all_time": 145,
      "total_rejections": 8,
      "total_reschedules": 15
    }
  }
}
```

### Get Completed Counts
```http
GET /api/team/members/completed-counts
Authorization: Bearer <token>
```

---

## 🔧 Subjects & Workflow

### Get Subjects List
```http
GET /api/subjects?status=assigned&technicianId={technicianId}&page=1&pageSize=20
Authorization: Bearer <token>
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
        "customer_name": "John Doe",
        "customer_phone": "+919876543210",
        "customer_address": "123 Main St, Chennai",
        "product_name": "LG Air Conditioner",
        "product_description": "1.5 Ton Split AC",
        "assigned_technician_id": "uuid",
        "status": "allocated",
        "priority": "normal",
        "schedule_date": "2026-03-27",
        "type_of_service": "installation",
        "warranty_end_date": "2026-12-31",
        "is_amc_service": false,
        "is_warranty_service": true
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

### Get Subject Details
```http
GET /api/subjects/{id}
Authorization: Bearer <token>
```

### Respond to Subject Assignment
```http
POST /api/subjects/{id}/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "accept",
  "visit_date": "2026-03-27",
  "visit_time": "14:30"
}
```

**Or for rejection:**
```json
{
  "action": "reject",
  "rejection_reason": "Customer unavailable"
}
```

### Update Subject Workflow
```http
POST /api/subjects/{id}/workflow
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "notes": "Started diagnosis"
}
```

**Available status transitions:**
- `allocated` → `accepted` (technician)
- `accepted` → `arrived` (technician)
- `arrived` → `in_progress` (technician)
- `in_progress` → `completed` (technician)
- `in_progress` → `incomplete` (technician)
- `incomplete` → `rescheduled` (office staff)

---

## 💳 Billing & Payments

### Get Subject Billing
```http
GET /api/subjects/{id}/billing
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bill": {
      "id": "uuid",
      "bill_number": "BILL-2026-001",
      "bill_type": "customer_receipt",
      "visit_charge": 300.00,
      "service_charge": 500.00,
      "accessories_total": 1200.00,
      "grand_total": 2000.00,
      "payment_status": "due",
      "payment_mode": null,
      "generated_at": "2026-03-27T12:00:00.000Z"
    },
    "accessories": [
      {
        "id": "uuid",
        "item_name": "AC Filter",
        "quantity": 2,
        "unit_price": 600.00,
        "total_price": 1200.00
      }
    ]
  }
}
```

### Add Accessory to Bill
```http
POST /api/subjects/{id}/billing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "add_accessory",
  "item_name": "AC Filter",
  "quantity": 2,
  "unit_price": 600.00
}
```

### Generate Bill
```http
POST /api/subjects/{id}/billing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "generate_bill",
  "visit_charge": 300.00,
  "service_charge": 500.00,
  "payment_mode": "cash"
}
```

### Update Payment Status
```http
PATCH /api/subjects/{id}/billing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "update_payment_status",
  "billId": "uuid",
  "payment_status": "paid",
  "payment_mode": "cash"
}
```

### Download Bill PDF
```http
GET /api/bills/{id}/download
Authorization: Bearer <token>
```

**Response:** PDF file with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="BILL-2026-001.pdf"
```

---

## ⏰ Attendance

### Toggle Attendance
```http
POST /api/attendance/toggle
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ON",
    "toggled_at": "2026-03-27T08:30:00.000Z",
    "message": "Attendance marked successfully"
  }
}
```

### Get Technician Completed Summary
```http
GET /api/dashboard/technician/completed-summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": 2,
    "week": 9,
    "month": 26,
    "year": 104,
    "sales": {
      "today": {
        "products_sold": 1,
        "parts_sold_qty": 3,
        "parts_sold_amount": 1450.00
      },
      "week": {
        "products_sold": 4,
        "parts_sold_qty": 11,
        "parts_sold_amount": 5320.00
      },
      "month": {
        "products_sold": 16,
        "parts_sold_qty": 39,
        "parts_sold_amount": 18760.00
      },
      "year": {
        "products_sold": 74,
        "parts_sold_qty": 188,
        "parts_sold_amount": 89210.00
      }
    }
  }
}
```

---

## 📦 Products & Inventory

### Get Products
```http
GET /api/products?category=ac&search=filter&page=1&pageSize=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "material_code": "AC-FILT-001",
        "product_name": "AC Filter",
        "description": "High quality AC filter",
        "category_id": "uuid",
        "category_name": "Air Conditioner",
        "product_type_id": "uuid",
        "product_type_name": "Spare Part",
        "brand": "LG",
        "mrp": 600.00,
        "purchase_price": 450.00,
        "hsn_sac_code": "8418",
        "is_active": true
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

## 📸 Media & Documents

### Upload Photos
```http
POST /api/subjects/{id}/photos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>
photoType: before_photo | after_photo | service_video
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photo_id": "uuid",
    "storage_path": "subjects/{id}/photo_{timestamp}.jpg",
    "public_url": "https://storage.url/photo.jpg",
    "file_size_bytes": 1024000,
    "mime_type": "image/jpeg"
  }
}
```

### Get Subject Photos
```http
GET /api/subjects/{id}/photos
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "uuid",
        "photo_type": "before_photo",
        "storage_path": "subjects/{id}/before.jpg",
        "public_url": "https://storage.url/before.jpg",
        "file_size_bytes": 1024000,
        "mime_type": "image/jpeg",
        "uploaded_at": "2026-03-27T12:00:00.000Z"
      }
    ]
  }
}
```

### Delete Photo
```http
DELETE /api/subjects/{id}/photos
Authorization: Bearer <token>
Content-Type: application/json

{
  "photo_id": "uuid",
  "storage_path": "subjects/{id}/photo.jpg"
}
```

---

## ⚠️ Error Handling

### Error Codes
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict | 409 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

### Common Error Scenarios

**Invalid Token:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Permission Denied:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to perform this action"
  }
}
```

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "phone_number",
        "message": "Phone number must be 10 digits"
      }
    ]
  }
}
```

---

## 📱 Flutter Integration Guide

### 1. API Client Setup

```dart
// lib/services/api_client.dart
import 'package:dio/dio.dart';

class ApiClient {
  late Dio _dio;
  
  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: 'https://your-domain.com/api',
      connectTimeout: Duration(seconds: 10),
      receiveTimeout: Duration(seconds: 10),
    ));
    
    // Add auth interceptor
    _dio.interceptors.add(AuthInterceptor());
    
    // Add logging interceptor for debug
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
      ));
    }
  }
  
  Future<Response> get(String path, {Map<String, dynamic>? query}) =>
      _dio.get(path, queryParameters: query);
      
  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);
      
  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);
      
  Future<Response> delete(String path) => _dio.delete(path);
}
```

### 2. Auth Interceptor

```dart
// lib/services/auth_interceptor.dart
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Add auth token
    final token = AuthService.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    // Add required headers
    options.headers['X-Client-Platform'] = 'hitech_technician';
    options.headers['X-App-Version'] = '1.0.0';
    options.headers['X-Timezone'] = DateTime.now().timeZoneName;
    
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired, refresh or logout
      AuthService.logout();
      // Navigate to login screen
    }
    handler.next(err);
  }
}
```

### 3. Repository Pattern

```dart
// lib/repositories/subject_repository.dart
class SubjectRepository {
  final ApiClient _apiClient = ApiClient();
  
  Future<ApiResponse<List<Subject>>> getSubjects({
    String? status,
    String? technicianId,
    int page = 1,
    int pageSize = 20,
  }) async {
    try {
      final response = await _apiClient.get('/subjects', query: {
        'status': status,
        'technicianId': technicianId,
        'page': page,
        'pageSize': pageSize,
      });
      
      return ApiResponse.success(
        data: (response.data['data']['subjects'] as List)
            .map((json) => Subject.fromJson(json))
            .toList(),
        pagination: Pagination.fromJson(response.data['data']['pagination']),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
  
  Future<ApiResponse<Subject>> getSubjectDetails(String id) async {
    try {
      final response = await _apiClient.get('/subjects/$id');
      
      return ApiResponse.success(
        data: Subject.fromJson(response.data['data']),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
  
  Future<ApiResponse<void>> respondToSubject(
    String id,
    String action,
    String? visitDate,
    String? visitTime,
    String? rejectionReason,
  ) async {
    try {
      final response = await _apiClient.post('/subjects/$id/respond', data: {
        'action': action,
        if (visitDate != null) 'visit_date': visitDate,
        if (visitTime != null) 'visit_time': visitTime,
        if (rejectionReason != null) 'rejection_reason': rejectionReason,
      });
      
      return ApiResponse.success();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
```

### 4. Data Models

```dart
// lib/models/subject.dart
class Subject {
  final String id;
  final String subjectNumber;
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final String productName;
  final String status;
  final String priority;
  final DateTime scheduleDate;
  final bool isAmcService;
  final bool isWarrantyService;
  
  Subject({
    required this.id,
    required this.subjectNumber,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    required this.productName,
    required this.status,
    required this.priority,
    required this.scheduleDate,
    required this.isAmcService,
    required this.isWarrantyService,
  });
  
  factory Subject.fromJson(Map<String, dynamic> json) {
    return Subject(
      id: json['id'],
      subjectNumber: json['subject_number'],
      customerName: json['customer_name'],
      customerPhone: json['customer_phone'],
      customerAddress: json['customer_address'],
      productName: json['product_name'],
      status: json['status'],
      priority: json['priority'],
      scheduleDate: DateTime.parse(json['schedule_date']),
      isAmcService: json['is_amc_service'] ?? false,
      isWarrantyService: json['is_warranty_service'] ?? false,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subject_number': subjectNumber,
      'customer_name': customerName,
      'customer_phone': customerPhone,
      'customer_address': customerAddress,
      'product_name': productName,
      'status': status,
      'priority': priority,
      'schedule_date': scheduleDate.toIso8601String(),
      'is_amc_service': isAmcService,
      'is_warranty_service': isWarrantyService,
    };
  }
}
```

### 5. Error Handling

```dart
// lib/exceptions/api_exception.dart
class ApiException implements Exception {
  final String code;
  final String message;
  final int? statusCode;
  final List<String>? details;
  
  ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.details,
  });
  
  factory ApiException.fromDioError(DioException error) {
    final response = error.response;
    final data = response?.data;
    
    if (data != null && data['error'] != null) {
      final errorData = data['error'];
      return ApiException(
        code: errorData['code'] ?? 'UNKNOWN_ERROR',
        message: errorData['message'] ?? 'An error occurred',
        statusCode: response?.statusCode,
        details: errorData['details']?.cast<String>(),
      );
    }
    
    return ApiException(
      code: 'NETWORK_ERROR',
      message: 'Network error occurred',
      statusCode: response?.statusCode,
    );
  }
  
  @override
  String toString() {
    return 'ApiException: $code - $message';
  }
}
```

### 6. State Management (BLoC/Provider)

```dart
// lib/bloc/subject_bloc.dart
class SubjectBloc extends Bloc<SubjectEvent, SubjectState> {
  final SubjectRepository _repository;
  
  SubjectBloc(this._repository) : super(SubjectInitial()) {
    on<LoadSubjects>(_onLoadSubjects);
    on<RespondToSubject>(_onRespondToSubject);
  }
  
  Future<void> _onLoadSubjects(
    LoadSubjects event,
    Emitter<SubjectState> emit,
  ) async {
    emit(SubjectLoading());
    try {
      final response = await _repository.getSubjects(
        status: event.status,
        technicianId: event.technicianId,
        page: event.page,
        pageSize: event.pageSize,
      );
      
      emit(SubjectLoaded(
        subjects: response.data!,
        pagination: response.pagination!,
        hasReachedMax: response.pagination!.page >= response.pagination!.totalPages,
      ));
    } on ApiException catch (e) {
      emit(SubjectError(e.message));
    }
  }
  
  Future<void> _onRespondToSubject(
    RespondToSubject event,
    Emitter<SubjectState> emit,
  ) async {
    try {
      await _repository.respondToSubject(
        event.subjectId,
        event.action,
        event.visitDate,
        event.visitTime,
        event.rejectionReason,
      );
      
      // Refresh the list
      add(LoadSubjects(
        status: event.currentStatus,
        technicianId: event.technicianId,
      ));
    } on ApiException catch (e) {
      emit(SubjectError(e.message));
    }
  }
}
```

### 7. Offline Support

```dart
// lib/services/offline_service.dart
class OfflineService {
  final HiveDatabase _database = HiveDatabase();
  
  Future<void> cacheSubjects(List<Subject> subjects) async {
    await _database.saveSubjects(subjects);
  }
  
  Future<List<Subject>> getCachedSubjects() async {
    return await _database.getSubjects();
  }
  
  Future<void> queueAction(OfflineAction action) async {
    await _database.addAction(action);
  }
  
  Future<void> syncActions() async {
    final actions = await _database.getPendingActions();
    
    for (final action in actions) {
      try {
        await _executeAction(action);
        await _database.removeAction(action.id);
      } catch (e) {
        // Keep action for retry
        await _database.updateActionStatus(action.id, 'failed');
      }
    }
  }
  
  Future<void> _executeAction(OfflineAction action) async {
    final apiClient = ApiClient();
    
    switch (action.type) {
      case 'respond_subject':
        await apiClient.post('/subjects/${action.subjectId}/respond', data: action.data);
        break;
      case 'update_attendance':
        await apiClient.post('/attendance/toggle');
        break;
      // Add other action types
    }
  }
}
```

---

## 🚀 Deployment & Testing

### Environment Configuration
```dart
// lib/config/app_config.dart
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );
  
  static const String appVersion = String.fromEnvironment(
    'APP_VERSION',
    defaultValue: '1.0.0',
  );
  
  static const bool enableLogging = bool.fromEnvironment(
    'ENABLE_LOGGING',
    defaultValue: true,
  );
}
```

### Testing Strategy
```dart
// test/repositories/subject_repository_test.dart
void main() {
  group('SubjectRepository', () {
    late SubjectRepository repository;
    late MockApiClient mockApiClient;
    
    setUp(() {
      mockApiClient = MockApiClient();
      repository = SubjectRepository(mockApiClient);
    });
    
    test('should return subjects list on success', () async {
      // Arrange
      final mockResponse = {
        'success': true,
        'data': {
          'subjects': [
            {
              'id': '1',
              'subject_number': 'SUB-001',
              'customer_name': 'John Doe',
              // ... other fields
            }
          ],
          'pagination': {
            'page': 1,
            'pageSize': 20,
            'total': 1,
            'totalPages': 1,
          }
        }
      };
      
      when(mockApiClient.get('/subjects', query: anyNamed('query')))
          .thenAnswer((_) async => Response(data: mockResponse, statusCode: 200));
      
      // Act
      final result = await repository.getSubjects();
      
      // Assert
      expect(result.success, true);
      expect(result.data!.length, 1);
      expect(result.data!.first.customerName, 'John Doe');
    });
  });
}
```

---

## 📝 Changelog

### v1.0.0 (2026-03-27)
- Initial comprehensive API documentation
- All implemented endpoints documented
- Flutter integration guide added
- Error handling patterns defined
- Offline support strategy included

### Next Updates
- Add webhook documentation
- Add real-time events (WebSocket)
- Add batch operations
- Add advanced filtering options

---

## 📞 Support

For API-related issues:
- **Technical Support**: +91 85903 77418
- **Email**: support@hitechsoftware.com
- **Documentation Updates**: Check `docs/WORK_LOG.md` for latest changes

---

**© 2026 Hi Tech Engineering, Kottayam Kerala. All rights reserved.**
