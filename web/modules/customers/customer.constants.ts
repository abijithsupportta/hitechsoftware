export const CUSTOMER_QUERY_KEYS = {
  all: ['customers'] as const,
  list: ['customers', 'list'] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
};

export const CUSTOMER_DEFAULT_PAGE_SIZE = 10;

export const KOTTAYAM_AREAS = [
  'Kottayam Town',
  'Ettumanoor',
  'Pala',
  'Changanassery',
  'Kanjirappally',
  'Ponkunnam',
  'Puthuppally',
  'Kumarakom',
  'Vaikom',
  'Kidangoor',
  'Erattupetta',
  'Mundakayam',
  'Kuravilangad',
  'Manarcaud',
  'Pampady',
  'Arpookara',
  'Aymanam',
  'Nattakom',
  'Thalayolaparambu',
  'Kaduthuruthy',
] as const;

export const SECONDARY_ADDRESS_LABEL_OPTIONS = [
  { label: 'Home', value: 'HOME' },
  { label: 'Office', value: 'OFFICE' },
  { label: 'Relative', value: 'RELATIVE' },
  { label: 'Other', value: 'OTHER' },
] as const;
