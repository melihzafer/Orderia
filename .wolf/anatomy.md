# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-08-13T21:48:34.103Z
> Files: 56 tracked | Anatomy hits: 0 | Misses: 0

## ./


## .agents/skills/supabase-postgres-best-practices/


## .agents/skills/supabase-postgres-best-practices/references/


## .agents/skills/supabase/


## .agents/skills/supabase/assets/


## .agents/skills/supabase/references/


## .claude/


## .claude/rules/


## .expo/


## .github/


## .github/workflows/


## .playwright-mcp/


## C:/Users/melih/.claude/


## C:/Users/melih/.claude/plans/

- `evet-festival-yar-nsa-sorted-book.md` — Festival — Partial Served Quantity (Kısmi Servis Miktarı) (~3025 tok)

## C:/Users/melih/.claude/projects/D--Projects-Orderia/memory/


## android/


## android/.gradle/


## android/.gradle/8.13/


## android/.gradle/buildOutputCleanup/


## android/.gradle/vcs-1/


## android/app/


## android/app/src/debug/


## android/app/src/main/


## android/app/src/main/java/com/zwolfe/orderia/


## android/app/src/main/res/drawable/


## android/app/src/main/res/mipmap-anydpi-v26/


## android/app/src/main/res/mipmap-hdpi/


## android/app/src/main/res/mipmap-mdpi/


## android/app/src/main/res/mipmap-xhdpi/


## android/app/src/main/res/mipmap-xxhdpi/


## android/app/src/main/res/mipmap-xxxhdpi/


## android/app/src/main/res/values-night/


## android/app/src/main/res/values/


## android/gradle/wrapper/


## assets/


## docs/


## docs/runbooks/


## docs/ux/


## e2e-pwa/


## e2e/


## mockup-v2/


## mockup/


## mockup/.playwright-mcp/


## public/


## scripts/


## scripts/load/


## src/components/


## src/config/


## src/config/__tests__/


## src/constants/


## src/contexts/

- `AuthContext.tsx` — deviceStorageKey (~6132 tok)

## src/contexts/__tests__/

- `AuthContext.test.tsx` — userId (~3729 tok)

## src/data/


## src/data/contracts/


## src/data/indexeddb/


## src/data/indexeddb/__tests__/


## src/data/runtime/

- `OrderiaDataContext.tsx` — initialSync (~7081 tok)

## src/data/runtime/__tests__/


## src/data/sqlite/


## src/data/sqlite/__tests__/


## src/data/sync/

- `mutationPushGateway.ts` — Her yerel komut kendi sunucu fonksiyonuna gider. Ayrim once depoya, sonra (~2289 tok)

## src/data/sync/__tests__/

- `mutationPushGateway.test.ts` — organizationId: mutation (~1751 tok)

## src/data/testing/


## src/data/testing/__tests__/


## src/design-system/


## src/design-system/__tests__/


## src/design-system/__tests__/__snapshots__/


## src/design-system/components/

- `index.ts` (~248 tok)
- `ServiceActionSheet.tsx` — Uzun basış ve taşma düğmesinin ortak hedefi: bir öğeye ait bağlamsal eylemler. (~1377 tok)
- `SyncStatusBanner.tsx` — Servis sırasında bağlantı durumu yalnızca masanın "..." menüsünü açınca (~928 tok)

## src/domain/

- `entities.ts` — The default service handoff for this product; legacy rows default to kitchen. (~3356 tok)
- `stateTransitions.ts` — Exports assertTableSessionTransition, assertCheckTransition, assertOrderItemTransition, assertPaymen (~675 tok)

## src/domain/__tests__/


## src/features/app-settings/

- `settingsCopy.ts` — Ayarlar ekranının metinleri burada yaşar. (~7715 tok)

## src/features/cancellation-reasons/

- `cancellationReasonGateway.ts` — `cancellation_reasons` doğrudan PostgREST üzerinden yönetici RLS'iyle (~754 tok)
- `index.ts` (~13 tok)

## src/features/layout-management/


## src/features/legacy-migration/

- `legacyMigration.ts` — Exports LegacyHall, LegacyTable, LegacyCategory, LegacyMenuItem + 13 more (~5332 tok)
- `legacyMigrationGateway.ts` — Exports LegacyMigrationScope, LegacyMigrationServerResult, CatalogReplaceCounts, CatalogReplaceResul (~1676 tok)

## src/features/legacy-migration/__tests__/


## src/features/manager-reports/


## src/features/manager-reports/__tests__/


## src/features/menu-management/

- `menuCatalogGateway.ts` — Soft-deletes a branch-scoped item (`deleted_at`). Covered by the same (~2747 tok)

## src/features/menu-management/__tests__/


## src/features/payments/


## src/features/payments/__tests__/


## src/features/pwa/

- `PwaLifecycleBanner.tsx` — Kurulum uyarısı kapatıldığında kalıcı olur — her sayfa yenilemesinde yeniden (~2210 tok)

## src/features/pwa/__tests__/


## src/features/receipt-archive/


## src/features/receipt-archive/__tests__/


## src/features/receipts/

- `receiptPdf.ts` — Exports PreparedReceiptPdf, generateReceiptPdf, ReceiptPdfGateway (~2416 tok)

## src/features/receipts/__tests__/


## src/features/service-board/

- `shiftBoardModel.ts` — Customer/order names are searchable from the open-order board. (~3899 tok)

## src/features/service-board/__tests__/

- `shiftBoardModel.test.ts` — organizationId: fixture (~3396 tok)

## src/features/table-operations/


## src/features/table-operations/__tests__/


## src/features/table-workspace/

- `fulfillment.ts` — Kaç adedin masaya götürüldüğü — `servedQuantity` yerine HER ZAMAN bunu oku. (~754 tok)
- `orderCommands.ts` — Marks ordered lines as served while leaving one idempotent outbox command per line. (~8873 tok)
- `workspaceCopy.ts` — Masa çalışma alanının bütün arayüz metinleri. (~6262 tok)

## src/features/table-workspace/__tests__/

- `orderCommands.test.ts` — Declares organizationId (~5619 tok)

## src/features/table-workspace/components/

- `OrderPane.tsx` — Açık hesabın sipariş satırları: gruplama, servis işaretleme ve satır eylemleri. (~4367 tok)
- `PalettePane.tsx` — Ürün paleti: kategori/favori daraltması, arama ve hızlı ekleme. (~2759 tok)
- `WorkspaceChrome.tsx` — Palet daraltma kapsamı: ya sabit bir grup ya da bir kategori kimliği. (~2111 tok)
- `WorkspaceModals.tsx` — Çalışma alanının modal ailesi: hesap adı, ürün/masa notu, ürün seçenekleri, (~5199 tok)

## src/i18n/

- `languages.ts` — Exports Translation, translations (~21108 tok)

## src/navigation/

- `AppNavigator.tsx` — Bir ekranı kendi hata sınırına sarar. (~2742 tok)
- `routes.ts` — Rota sözleşmesi — yalnızca tipler, hiçbir ekran içe aktarılmaz. (~501 tok)

## src/observability/


## src/observability/__tests__/


## src/screens/

- `AddCategoryScreenModern.tsx` — AddCategoryScreenModern (~2194 tok)
- `AddHallScreenModern.tsx` — AddHallScreenModern (~1659 tok)
- `AddTableScreenModern.tsx` — AddTableScreenModern (~1973 tok)
- `AnalyticsScreen.tsx` — AnalyticsScreen (~7792 tok)
- `CancellationReasonsScreen.tsx` — CancellationReasonsScreen (~1751 tok)
- `HistoryScreen.tsx` — archivePageSize (~6191 tok)
- `index.ts` (~519 tok)
- `LegacyTableDetailScreen.tsx` — localCancellationReasons — renders table (~15580 tok)
- `MenuAssistantScreen.tsx` — MenuAssistantScreen (~8570 tok)
- `MenuScreen.tsx` — MenuScreen (~8155 tok)
- `OrdersFlowScreen.tsx` — Orders is intentionally a short navigation flow. Operational filters and (~5268 tok)
- `RegisterScreen.tsx` — emailPattern (~2584 tok)
- `SettingsScreen.tsx` — Dosya seçme ve doğrulama burada biter; veriyi yazma işi onaydan sonra (~8954 tok)
- `TableDetailScreen.tsx` — "Yeni hesap"a basıldı, henüz gönderilmedi. (~12202 tok)

## src/screens/__tests__/

- `AnalyticsScreen.test.tsx` — RTQ-002 regresyon testi: cihaz bir bulut işletmesine hiç bağlanmamışken (~756 tok)
- `HistoryScreen.test.tsx` — RTQ-002 regresyon testi: cihaz bir bulut işletmesine hiç bağlanmamışken (~721 tok)
- `MenuAssistantScreen.test.tsx` — RTQ-005 regresyon testi: cihaz bir bulut işletmesine hiç bağlanmamışken (~788 tok)

## src/services/


## src/services/supabase/

- `database.types.ts` — Exports Json, OrganizationRow, BranchRow, ProfileRow + 18 more (~5346 tok)

## src/services/supabase/__tests__/


## src/stores/

- `orderStore.ts` — Exports useOrderStore (~4370 tok)

## src/stores/__tests__/

- `financialBehavior.test.ts` — now: createLine, createTicket (~1830 tok)

## src/test-support/


## src/types/


## src/utils/


## src/utils/__tests__/


## supabase/


## supabase/.temp/


## supabase/.temp/pgdelta/


## supabase/functions/


## supabase/functions/menu-ai-draft/


## supabase/functions/signup-approval/


## supabase/migrations/

- `20260808120000_check_rename_command.sql` — Renaming a check ("Mehmet Ağa") had no server-side command handler at all: (~1745 tok)
- `20260808130000_seed_cancellation_reasons.sql` — The cancellation_reasons table shipped with manager-insert RLS but no seed (~1239 tok)
- `20260811000000_replace_catalog_from_legacy_snapshot.sql` — Catalog-only variant of the legacy migration: lets a manager re-import a (~3401 tok)
- `20260813120000_order_item_serve_quantity_command.sql` — Kismi servis: bir satirin kac adedinin masaya goturuldugunu saklar. (~2034 tok)
