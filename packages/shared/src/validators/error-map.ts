import type { ZodErrorMap } from 'zod';

const en: Record<string, string> = {
  invalid_type: 'Expected {expected}, received {received}',
  invalid_string_email: 'Valid email required',
  invalid_string_url: 'Valid URL required',
  too_small_string: 'Must be at least {minimum} characters',
  too_big_string: 'Must not exceed {maximum} characters',
  too_small_number: 'Must be at least {minimum}',
  too_big_number: 'Must not exceed {maximum}',
  too_small_array: 'Must contain at least {minimum} item(s)',
  invalid_enum_value: 'Invalid option. Expected: {options}',
  custom: 'Invalid value',
};

const hi: Record<string, string> = {
  invalid_type: '{expected} अपेक्षित, {received} प्राप्त',
  invalid_string_email: 'कृपया सही ईमेल डालें',
  invalid_string_url: 'कृपया सही URL डालें',
  too_small_string: 'कम से कम {minimum} अक्षर होने चाहिए',
  too_big_string: '{maximum} अक्षर से अधिक नहीं होना चाहिए',
  too_small_number: 'कम से कम {minimum} होना चाहिए',
  too_big_number: '{maximum} से अधिक नहीं होना चाहिए',
  too_small_array: 'कम से कम {minimum} आइटम होने चाहिए',
  invalid_enum_value: 'अमान्य विकल्प। अपेक्षित: {options}',
  custom: 'अमान्य मान',
};

const LOCALE_MESSAGES: Record<string, Record<string, string>> = { en, hi };

export function createErrorMap(locale: string): ZodErrorMap {
  const messages = LOCALE_MESSAGES[locale] ?? en;
  const fallback = messages['custom'] ?? 'Invalid value';

  return (issue, ctx) => {
    let message: string = ctx.defaultError;

    if (issue.code === 'invalid_type') {
      message = (messages['invalid_type'] ?? fallback)
        .replace('{expected}', String(issue.expected))
        .replace('{received}', String(issue.received));
    } else if (issue.code === 'too_small') {
      const key = `too_small_${issue.type}`;
      message = (messages[key] ?? fallback).replace('{minimum}', String(issue.minimum));
    } else if (issue.code === 'too_big') {
      const key = `too_big_${issue.type}`;
      message = (messages[key] ?? fallback).replace('{maximum}', String(issue.maximum));
    } else if (issue.code === 'invalid_string') {
      const key = `invalid_string_${String(issue.validation)}`;
      message = messages[key] ?? fallback;
    } else if (issue.code === 'invalid_enum_value') {
      message = (messages['invalid_enum_value'] ?? fallback).replace(
        '{options}',
        issue.options.join(', '),
      );
    } else if (issue.code === 'custom') {
      message = issue.message ?? fallback;
    }

    return { message };
  };
}

export const ERROR_MAP_LOCALES = Object.keys(LOCALE_MESSAGES);
