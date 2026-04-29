export { emailField, DISPOSABLE_DOMAINS } from './email';
export type { Email } from './email';

export { passwordField, loginPasswordField, PASSWORD_RULES } from './password';
export type { Password } from './password';

export {
  phoneField,
  indianPhoneField,
  internationalPhoneField,
  formatPhoneE164,
  COUNTRY_CODES,
} from './phone';
export type { Phone } from './phone';

export { otpField, OTP_CONFIG } from './otp';
export type { OTP } from './otp';

export { nameField, optionalNameField, sanitizeHtml } from './name';
export type { Name } from './name';

export { uuidField, stringIdField } from './uuid';
export type { UUID } from './uuid';

export { dateField, dobField, futureDateField } from './date';
export type { DateString } from './date';

export { localeField, optionalLocaleField, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './locale';
export type { Locale, SupportedLocale } from './locale';

export {
  offsetPaginationSchema,
  cursorPaginationSchema,
  sortOrderField,
  PAGINATION_LIMITS,
} from './pagination';
export type { OffsetPagination, CursorPagination, SortOrder } from './pagination';
