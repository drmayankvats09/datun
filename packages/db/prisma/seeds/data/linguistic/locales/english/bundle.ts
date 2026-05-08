// ═══════════════════════════════════════════════════════════════
// ENGLISH LOCALE BUNDLE — Indian English (12M primary speakers)
// ═══════════════════════════════════════════════════════════════

// OLD (Faker v9 path — broken in v10):
// import { faker } from '@faker-js/faker/locale/en_IND';

// NEW (Faker v10 official path):
import { en_IN, en, base, Faker } from '@faker-js/faker';

const faker = new Faker({ locale: [en_IN, en, base] });
import type { LocaleBundle } from '../../types';

export const ENGLISH_BUNDLE: LocaleBundle = {
  locale: 'english',
  displayName: 'English',
  displayNameNative: 'English',
  speakerCountCrore: 12,
  names: {
    firstNamesMale: Array.from({ length: 30 }, () => faker.person.firstName('male')),
    firstNamesFemale: Array.from({ length: 30 }, () => faker.person.firstName('female')),
    lastNames: Array.from({ length: 30 }, () => faker.person.lastName()),
  },
  patientOpeners: [
    'Doctor, I have severe pain in my upper right molar',
    'Hi, my gums bleed every time I brush',
    'My child has a cavity in their milk tooth',
    'I get sharp pain when I drink cold water',
    'I have persistent bad breath despite brushing',
    'My toothache is keeping me awake at night',
    'My wisdom tooth is coming out and it hurts',
    'My teeth are yellow and I want them whitened',
    'My gums are swollen and tender',
    'My front teeth are crooked, I want braces',
    "I have a chronic mouth ulcer that won't heal",
    'A filling fell out yesterday and the edge is sharp',
    'I am pregnant, is dental treatment safe?',
    'I am diabetic and need extraction guidance',
    'My TMJ clicks when chewing, want assessment',
  ],
  followUpQuestions: [
    'How long have you had this issue?',
    'Is the pain sharp, dull, or throbbing?',
    'Does it worsen with hot or cold?',
    'Are you having difficulty eating?',
    'How old are you?',
    'Are you currently pregnant?',
    'Are you taking any medications?',
    'Do you have any known allergies?',
    'Do you have diabetes or hypertension?',
    'When did you last visit a dentist?',
  ],
  aiAcknowledgements: [
    'I understand your concern. Let me guide you appropriately.',
    'This is a common dental issue. Let me explain step by step.',
    'I see what you mean. Let me ask a few questions to help better.',
    'This sounds like it needs urgent attention. Let me explain.',
    "Thank you for sharing that. Let's proceed.",
  ],
  painVocabulary: {
    throbbing: 'throbbing pain',
    sharp: 'sharp piercing pain',
    dull: 'dull aching pain',
    burning: 'burning sensation',
    shooting: 'shooting pain',
    constant: 'constant pain',
    intermittent: 'intermittent pain',
  },
};
