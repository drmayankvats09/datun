// ═══════════════════════════════════════════════════════════════
// KB ARTICLE FACTORY — Self-serve help articles
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface KbArticleOutput {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly contentMarkdown: string;
  readonly tags: readonly string[];
  readonly authoredByUserId: string;
  readonly status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  readonly languages: readonly string[];
  readonly viewCount: number;
  readonly helpfulVotes: number;
  readonly unhelpfulVotes: number;
  readonly relatedTicketCategory: string | null;
  readonly publishedAt: Date | null;
  readonly lastUpdatedAt: Date;
  readonly createdAt: Date;
}

interface KbArticleTransient {
  readonly category?: string;
}

export const kbArticleFactory = defineFactory<KbArticleOutput, KbArticleTransient>({
  name: 'user' as 'user',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    const category =
      transient.category ??
      faker.helpers.arrayElement([
        'getting-started',
        'consultations',
        'appointments',
        'billing',
        'whatsapp',
        'privacy',
        'troubleshooting',
      ]);

    return {
      id: `kb-${String(sequence).padStart(8, '0')}`,
      slug: `${category}-${faker.lorem.slug(3)}`,
      title: faker.lorem.sentence({ min: 5, max: 10 }).replace(/\.$/, '?'),
      category,
      subcategory: faker.helpers.maybe(() => faker.lorem.word(), { probability: 0.5 }) ?? null,
      contentMarkdown: `# ${faker.lorem.sentence()}\n\n${faker.lorem.paragraphs(3, '\n\n')}`,
      tags: faker.helpers.arrayElements(['how-to', 'troubleshooting', 'faq', 'guide', 'tutorial'], {
        min: 1,
        max: 3,
      }),
      authoredByUserId: 'user-000001',
      status: faker.helpers.weightedArrayElement([
        { weight: 80, value: 'PUBLISHED' as const },
        { weight: 10, value: 'DRAFT' as const },
        { weight: 7, value: 'REVIEW' as const },
        { weight: 3, value: 'ARCHIVED' as const },
      ]),
      languages: faker.helpers.arrayElements(['english', 'hindi'], { min: 1, max: 2 }),
      viewCount: faker.number.int({ min: 0, max: 50000 }),
      helpfulVotes: faker.number.int({ min: 0, max: 500 }),
      unhelpfulVotes: faker.number.int({ min: 0, max: 50 }),
      relatedTicketCategory:
        faker.helpers.maybe(
          () => faker.helpers.arrayElement(['BILLING', 'AI_QUALITY', 'APPOINTMENT']),
          { probability: 0.6 },
        ) ?? null,
      publishedAt: faker.date.past({ years: 1 }),
      lastUpdatedAt: faker.date.recent({ days: 60 }),
      createdAt: faker.date.past({ years: 1 }),
    };
  },

  persist: async (article) => article,
});
