import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { RequirePermission } from './RequirePermission'
import { RequirePhase } from './RequirePhase'
import type { PermissionKey } from '@/permissions/permissions'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage'
import { HomePage } from '@/pages/HomePage'
import { TasksPage } from '@/pages/TasksPage'
import { RecordsPage } from '@/pages/RecordsPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { HelpPage } from '@/pages/HelpPage'
import { FieldQcInfoPage } from '@/pages/FieldQcInfoPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { UnscopedPlaceholderPage } from '@/pages/UnscopedPlaceholderPage'
import { FarmersListPage } from '@/features/farmers/pages/FarmersListPage'
import { FarmerRegistrationPage } from '@/features/farmers/pages/FarmerRegistrationPage'
import { FarmerDetailPage } from '@/features/farmers/pages/FarmerDetailPage'
import { FarmerEditPage } from '@/features/farmers/pages/FarmerEditPage'
import { BankDetailsPage } from '@/features/farmers/pages/BankDetailsPage'
import { SeasonRegistrationsListPage } from '@/features/seasonRegistrations/pages/SeasonRegistrationsListPage'
import { PlotsListPage } from '@/features/plots/pages/PlotsListPage'
import { PlotRegistrationPage } from '@/features/plots/pages/PlotRegistrationPage'
import { PlotDetailPage } from '@/features/plots/pages/PlotDetailPage'
import { LabSamplesListPage } from '@/features/labSamples/pages/LabSamplesListPage'
import { LabSampleNewPage } from '@/features/labSamples/pages/LabSampleNewPage'
import { LabSampleDetailPage } from '@/features/labSamples/pages/LabSampleDetailPage'
import { ContractsListPage } from '@/features/contracts/pages/ContractsListPage'
import { ContractNewPage } from '@/features/contracts/pages/ContractNewPage'
import { ContractDetailPage } from '@/features/contracts/pages/ContractDetailPage'
import { HarvestsListPage } from '@/features/harvests/pages/HarvestsListPage'
import { HarvestNewPage } from '@/features/harvests/pages/HarvestNewPage'
import { HarvestDetailPage } from '@/features/harvests/pages/HarvestDetailPage'
import { VehicleTripsPage } from '@/features/harvests/pages/VehicleTripsPage'
import { WeighingListPage } from '@/features/weighing/pages/WeighingListPage'
import { WeighingNewPage } from '@/features/weighing/pages/WeighingNewPage'
import { WeighingDetailPage } from '@/features/weighing/pages/WeighingDetailPage'
import { WeighingSlipPrint } from '@/features/weighing/pages/WeighingSlipPrint'
import { ArrivalQcListPage } from '@/features/arrivalQc/pages/ArrivalQcListPage'
import { ArrivalQcNewPage } from '@/features/arrivalQc/pages/ArrivalQcNewPage'
import { ArrivalQcDetailPage } from '@/features/arrivalQc/pages/ArrivalQcDetailPage'
import { PackagingListPage } from '@/features/packaging/pages/PackagingListPage'
import { PackagingNewPage } from '@/features/packaging/pages/PackagingNewPage'
import { PackagingDetailPage } from '@/features/packaging/pages/PackagingDetailPage'
import { MaterialsListPage } from '@/features/itemMaster/pages/MaterialsListPage'
import { MaterialNewPage } from '@/features/itemMaster/pages/MaterialNewPage'
import { MaterialDetailPage } from '@/features/itemMaster/pages/MaterialDetailPage'
import { ProductCombinationsListPage } from '@/features/itemMaster/pages/ProductCombinationsListPage'
import { ProductCombinationNewPage } from '@/features/itemMaster/pages/ProductCombinationNewPage'
import { ProductCombinationEditPage } from '@/features/itemMaster/pages/ProductCombinationEditPage'
import { BomListPage } from '@/features/bom/pages/BomListPage'
import { BomNewPage } from '@/features/bom/pages/BomNewPage'
import { BomDetailPage } from '@/features/bom/pages/BomDetailPage'
import { InventoryDashboardPage } from '@/features/inventory/pages/InventoryDashboardPage'
import { StockInPage } from '@/features/inventory/pages/StockInPage'
import { AdjustmentsPage } from '@/features/inventory/pages/AdjustmentsPage'
import { MovementsPage } from '@/features/inventory/pages/MovementsPage'
import { AlertsPage } from '@/features/inventory/pages/AlertsPage'
import { OrderCalculatorPage } from '@/features/inventory/pages/OrderCalculatorPage'
import { OrderSheetPrintPage } from '@/features/inventory/pages/OrderSheetPrintPage'
import { PalletisationListPage } from '@/features/palletisation/pages/PalletisationListPage'
import { PalletisationNewPage } from '@/features/palletisation/pages/PalletisationNewPage'
import { PalletisationDetailPage } from '@/features/palletisation/pages/PalletisationDetailPage'
import { PreCoolingListPage } from '@/features/preCooling/pages/PreCoolingListPage'
import { PreCoolingNewPage } from '@/features/preCooling/pages/PreCoolingNewPage'
import { PreCoolingDetailPage } from '@/features/preCooling/pages/PreCoolingDetailPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { CompanySettingsPage } from '@/features/companySettings/pages/CompanySettingsPage'
import { AdminDashboardPage } from '@/features/adminDashboard/pages/AdminDashboardPage'
import { ActiveFarmsPage } from '@/features/adminDashboard/pages/ActiveFarmsPage'
import { SeasonsPage } from '@/features/seasons/pages/SeasonsPage'
import { AuditTrailPage } from '@/features/auditLog/pages/AuditTrailPage'
import { UserActivityPage } from '@/features/userActivity/pages/UserActivityPage'

/**
 * Modules fully scoped in the project docs (prompt.md §7) but not yet built
 * in this phase-by-phase implementation. `path` uses a trailing `/*` so
 * /new, /:id, /:id/edit etc. all resolve to the same stub until the feature
 * lands and replaces this entry with real nested routes.
 */
const COMING_SOON_ROUTES: Array<{ path: string; title: string; phase: string; permission: PermissionKey }> = []

/** Modules with no finalized business spec yet (prompt.md §20, Open_Questions.md). */
const UNSCOPED_ROUTES: Array<{ path: string; title: string; permission: PermissionKey; openQuestionRef?: string }> = [
  { path: '/container-indents', title: 'Container Indent', permission: 'containerIndents:read' },
  { path: '/container-loading', title: 'Container Loading', permission: 'containerLoading:read' },
  { path: '/farmer-invoices', title: 'Farmer Invoices', permission: 'farmerInvoices:read', openQuestionRef: 'Q6' },
  { path: '/export-documents', title: 'Export Documents', permission: 'exportDocuments:read' },
  { path: '/finished-goods-qc', title: 'Finished Goods QC / Cold Storage Exit QC', permission: 'finishedGoodsQc:read', openQuestionRef: 'Q13' },
  { path: '/reports', title: 'Reports & Dashboards', permission: 'reports:read' },
]

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Standalone print page — no sidebar/header chrome, opened in a new tab from the Order Calculator. */}
        <Route element={<RequirePhase phase="inventory_management" />}>
          <Route path="/inventory/order-sheet" element={<OrderSheetPrintPage />} />
        </Route>

        {/* Standalone print page — no sidebar/header chrome, opened in a new tab from Weighing Detail. */}
        <Route element={<RequirePhase phase="weighing" />}>
          <Route path="/weighing/:id/print" element={<WeighingSlipPrint />} />
        </Route>

        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Farmer & Plot (Phase 2) */}
          <Route element={<RequirePhase phase="farmer_registration" />}>
            <Route path="/farmers" element={<FarmersListPage />} />
            <Route path="/farmers/:id" element={<FarmerDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="farmer_registration" />}>
            <Route path="/farmers/new" element={<FarmerRegistrationPage />} />
            <Route path="/farmers/:id/edit" element={<FarmerEditPage />} />
          </Route>
          <Route element={<RequirePhase phase="farmer_registration" />}>
            <Route path="/farmers/:id/bank-details" element={<BankDetailsPage />} />
          </Route>

          <Route element={<RequirePhase phase="plot_registration" />}>
            <Route path="/season-registrations" element={<SeasonRegistrationsListPage />} />
          </Route>

          <Route element={<RequirePhase phase="plot_registration" />}>
            <Route path="/plots" element={<PlotsListPage />} />
            <Route path="/plots/:id" element={<PlotDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="plot_registration" />}>
            <Route path="/plots/new" element={<PlotRegistrationPage />} />
          </Route>

          <Route element={<RequirePhase phase="field_qc" />}>
            <Route path="/field-qc" element={<FieldQcInfoPage />} />
          </Route>

          {/* Lab, Contract, Harvest, Weighing (Phase 3) */}
          <Route element={<RequirePhase phase="lab_sampling" />}>
            <Route path="/lab-samples" element={<LabSamplesListPage />} />
            <Route path="/lab-samples/:id" element={<LabSampleDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="lab_sampling" />}>
            <Route path="/lab-samples/new" element={<LabSampleNewPage />} />
          </Route>

          <Route element={<RequirePhase phase="farmer_contract" />}>
            <Route path="/contracts" element={<ContractsListPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="farmer_contract" />}>
            <Route path="/contracts/new" element={<ContractNewPage />} />
          </Route>

          <Route element={<RequirePhase phase="harvesting" />}>
            <Route path="/harvests" element={<HarvestsListPage />} />
            <Route path="/harvests/:id" element={<HarvestDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="harvesting" />}>
            <Route path="/harvests/new" element={<HarvestNewPage />} />
          </Route>

          <Route element={<RequirePhase phase="harvesting" />}>
            <Route path="/vehicle-trips" element={<VehicleTripsPage />} />
          </Route>

          <Route element={<RequirePhase phase="weighing" />}>
            <Route path="/weighing" element={<WeighingListPage />} />
            <Route path="/weighing/:id" element={<WeighingDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="weighing" />}>
            <Route path="/weighing/new" element={<WeighingNewPage />} />
          </Route>

          {/* Arrival QC, Goods Receiving, Packaging (Phase 4) */}
          <Route element={<RequirePhase phase="arrival_qc" />}>
            <Route path="/arrival-qc" element={<ArrivalQcListPage />} />
            <Route path="/arrival-qc/:id" element={<ArrivalQcDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="arrival_qc" />}>
            <Route path="/arrival-qc/new" element={<ArrivalQcNewPage />} />
          </Route>

          <Route element={<RequirePhase phase="packaging" />}>
            <Route path="/packaging" element={<PackagingListPage />} />
            <Route path="/packaging/:id" element={<PackagingDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="packaging" />}>
            <Route path="/packaging/new" element={<PackagingNewPage />} />
          </Route>

          {/* Item Master, BOM, Inventory (Phase 5) */}
          <Route element={<RequirePhase phase="inventory_management" />}>
            <Route path="/inventory" element={<InventoryDashboardPage />} />
            <Route path="/inventory/materials" element={<MaterialsListPage />} />
            <Route path="/inventory/materials/:id" element={<MaterialDetailPage />} />
            <Route path="/inventory/movements" element={<MovementsPage />} />
            <Route path="/inventory/alerts" element={<AlertsPage />} />
            <Route path="/inventory/products" element={<ProductCombinationsListPage />} />
            <Route path="/inventory/order-calculator" element={<OrderCalculatorPage />} />
          </Route>
          <Route element={<RequirePhase phase="inventory_management" />}>
            <Route path="/inventory/materials/new" element={<MaterialNewPage />} />
            <Route path="/inventory/stock-in" element={<StockInPage />} />
            <Route path="/inventory/adjustments" element={<AdjustmentsPage />} />
            <Route path="/inventory/products/new" element={<ProductCombinationNewPage />} />
            <Route path="/inventory/products/:id" element={<ProductCombinationEditPage />} />
          </Route>

          {/* Moved from top-level /bom to /inventory/bom, 2026-08-11 */}
          <Route element={<RequirePhase phase="inventory_management" />}>
            <Route path="/inventory/bom" element={<BomListPage />} />
            <Route path="/inventory/bom/:id" element={<BomDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="inventory_management" />}>
            <Route path="/inventory/bom/new" element={<BomNewPage />} />
          </Route>

          {/* Palletisation, Pre-Cooling (Phase 6) */}
          <Route element={<RequirePhase phase="palletisation" />}>
            <Route path="/palletisation" element={<PalletisationListPage />} />
            <Route path="/palletisation/:id" element={<PalletisationDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="palletisation" />}>
            <Route path="/palletisation/new" element={<PalletisationNewPage />} />
          </Route>

          <Route element={<RequirePhase phase="pre_cooling" />}>
            <Route path="/pre-cooling" element={<PreCoolingListPage />} />
            <Route path="/pre-cooling/:id" element={<PreCoolingDetailPage />} />
          </Route>
          <Route element={<RequirePhase phase="pre_cooling" />}>
            <Route path="/pre-cooling/new" element={<PreCoolingNewPage />} />
          </Route>

          {COMING_SOON_ROUTES.map(({ path, title, phase, permission }) => (
            <Route key={path} element={<RequirePermission permission={permission} />}>
              <Route path={path} element={<ComingSoonPage title={title} phase={phase} />} />
            </Route>
          ))}

          {UNSCOPED_ROUTES.map(({ path, title, permission, openQuestionRef }) => (
            <Route key={path} element={<RequirePermission permission={permission} />}>
              <Route path={path} element={<UnscopedPlaceholderPage title={title} openQuestionRef={openQuestionRef} />} />
            </Route>
          ))}

          {/* Split from the admin phase 2026-09-01 — a Users-phase holder
              manages accounts without needing full Admin access (see
              backend app/services/user_admin_guard.py for the actual
              boundary between the two). */}
          <Route element={<RequirePhase phase="users" />}>
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>
          <Route element={<RequirePhase phase="admin" />}>
            <Route path="/admin/settings" element={<CompanySettingsPage />} />
          </Route>

          {/* Team 2 admin features (adminDashboard, seasons, auditLog, userActivity), added 2026-08-11. */}
          <Route element={<RequirePhase phase="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          </Route>
          <Route element={<RequirePhase phase="admin" />}>
            <Route path="/admin/active-farms" element={<ActiveFarmsPage />} />
          </Route>
          <Route element={<RequirePhase phase="admin" />}>
            <Route path="/admin/seasons" element={<SeasonsPage />} />
          </Route>
          <Route element={<RequirePhase phase="admin" />}>
            <Route path="/admin/user-activity" element={<UserActivityPage />} />
          </Route>
          <Route element={<RequirePhase phase="admin" />}>
            <Route path="/admin/audit-trail" element={<AuditTrailPage />} />
          </Route>

          <Route index element={<Navigate to="/home" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
