// ═══════════════════════════════════════════════════════════════
// SKELETONS — barrel exports for every page-specific loading
// placeholder shipped by Task #51.
//
// Importing surfaces use a single line:
//
//   import {
//     DataTableSkeleton,
//     SecurityDashboardSkeleton,
//     MessageSkeleton,
//   } from '@/components/feedback/skeletons';
//
// The generic page-level skeletons (PageSkeleton, CardGridSkeleton,
// ChatSkeleton, FormSkeleton) remain exported from the parent
// feedback barrel — they are layout-agnostic, while the skeletons
// below are domain-specific.
//
// Each export is paired with a matching real component:
//   • DataTableSkeleton              → any shadcn <Table>
//   • ConsultationCardSkeleton       → history-drawer card
//   • MessageSkeleton                → chat bubble (AI / user)
//   • ClinicCardSkeleton             → clinic listing card
//   • StatCardSkeleton               → KPI card
//   • ChartSkeleton                  → Recharts container
//   • AuthFormSkeleton               → login / signup / reset
//   • DocumentSkeleton               → legal / docs pages
//   • DrawerSkeleton                 → Sheet content
//   • SecurityDashboardSkeleton      → /admin/security composite
//   • AdminGateSkeleton              → /admin/* auth hydration
//   • ConsultationLoadingSkeleton    → /consult/[id] hydration
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

export { DataTableSkeleton, type DataTableSkeletonProps } from './data-table-skeleton';

export {
  ConsultationCardSkeleton,
  type ConsultationCardSkeletonProps,
} from './consultation-card-skeleton';

export { MessageSkeleton, type MessageSkeletonProps } from './message-skeleton';

export { ClinicCardSkeleton, type ClinicCardSkeletonProps } from './clinic-card-skeleton';

export { StatCardSkeleton, type StatCardSkeletonProps } from './stat-card-skeleton';

export { ChartSkeleton, type ChartSkeletonProps } from './chart-skeleton';

export { AuthFormSkeleton, type AuthFormSkeletonProps } from './auth-form-skeleton';

export { DocumentSkeleton, type DocumentSkeletonProps } from './document-skeleton';

export { DrawerSkeleton, type DrawerSkeletonProps } from './drawer-skeleton';

export {
  SecurityDashboardSkeleton,
  type SecurityDashboardSkeletonProps,
} from './security-dashboard-skeleton';

export { AdminGateSkeleton, type AdminGateSkeletonProps } from './admin-gate-skeleton';

export {
  ConsultationLoadingSkeleton,
  type ConsultationLoadingSkeletonProps,
} from './consultation-loading-skeleton';
