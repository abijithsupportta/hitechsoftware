import { z } from 'zod';

const INDIAN_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

export const subjectNumberSchema = z
	.string()
	.trim()
	.min(3, 'Ticket ID is required')
	.max(50, 'Ticket ID is too long');

export const subjectPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createSubjectSchema = z.object({
	subject_number: subjectNumberSchema,
	customer_id: z.string().uuid('Invalid customer id'),
	product_id: z.string().uuid('Invalid product id').optional().or(z.literal('')),
	assigned_technician_id: z.string().uuid('Technician is required').optional().or(z.literal('')),
	job_type: z.enum(['IN_WARRANTY', 'OUT_OF_WARRANTY', 'AMC']),
	description: z.string().trim().min(5, 'Problem description is required'),
	priority: subjectPrioritySchema,
	complaint_details: z.string().trim().optional().or(z.literal('')),
	serial_number: z.string().trim().max(100).optional().or(z.literal('')),
	schedule_date: z.string().trim().optional().or(z.literal('')),
	created_by: z.string().uuid('Invalid creator id'),
});

export const subjectLookupPhoneSchema = z
	.string()
	.trim()
	.regex(INDIAN_PHONE_REGEX, 'Enter a valid Indian phone number');

export const smartCreateSubjectSchema = z
	.object({
		subject_number: subjectNumberSchema,
		phone_number: subjectLookupPhoneSchema,
		customer_id: z.string().uuid('Invalid customer id').optional(),
		new_customer: z
			.object({
				customer_name: z.string().trim().min(2, 'Customer name is required'),
				email: z.string().trim().email('Please enter a valid email').optional().or(z.literal('')),
				primary_address_line1: z.string().trim().min(3, 'Address is required'),
				primary_address_line2: z.string().trim().optional().or(z.literal('')),
				primary_area: z.string().trim().min(2, 'Area is required'),
				primary_city: z.string().trim().min(2, 'City is required'),
				primary_postal_code: z.string().trim().regex(/^\d{6}$/, 'Postal code must be 6 digits'),
			})
			.optional(),
		product_id: z.string().uuid('Invalid product id').optional().or(z.literal('')),
		assigned_technician_id: z.string().uuid('Technician is required'),
		job_type: z.enum(['IN_WARRANTY', 'OUT_OF_WARRANTY', 'AMC']),
		description: z.string().trim().min(5, 'Problem description is required'),
		priority: subjectPrioritySchema,
		complaint_details: z.string().trim().optional().or(z.literal('')),
		serial_number: z.string().trim().max(100).optional().or(z.literal('')),
		schedule_date: z.string().trim().optional().or(z.literal('')),
		created_by: z.string().uuid('Invalid creator id'),
	})
	.superRefine((value, ctx) => {
		if (!value.customer_id && !value.new_customer) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['phone_number'],
				message: 'Customer was not found. Enter customer details to continue.',
			});
		}
	});
