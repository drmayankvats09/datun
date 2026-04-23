/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: 'https://datunai.com',
  generateRobotsTxt: true,
  changefreq: 'monthly',
  priority: 0.7,

  additionalPaths: async () => [
    { loc: '/privacy', changefreq: 'monthly', priority: 0.6, lastmod: new Date().toISOString() },
    { loc: '/terms', changefreq: 'monthly', priority: 0.6, lastmod: new Date().toISOString() },
    { loc: '/cookies', changefreq: 'monthly', priority: 0.4, lastmod: new Date().toISOString() },
    {
      loc: '/dpdp-notice',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    },
  ],

  exclude: ['/api/*', '/auth/*', '/dashboard/*', '/admin/*'],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dashboard/', '/admin/'],
      },
    ],
  },
};

export default config;
