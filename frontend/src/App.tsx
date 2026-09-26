import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { ActivityPage } from './features/activity/ActivityPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DiscrepanciesPage } from './features/discrepancies/DiscrepanciesPage'
import { OutboxPage } from './features/discrepancies/OutboxPage'
import { InventoryPage } from './features/inventory/InventoryPage'
import { PODetailPage } from './features/purchasing/PODetailPage'
import { PurchaseOrdersPage } from './features/purchasing/PurchaseOrdersPage'
import { ReceiptDetailPage } from './features/receipts/ReceiptDetailPage'
import { ReceiptsPage } from './features/receipts/ReceiptsPage'
import { ReceivingPage } from './features/receiving/ReceivingPage'
import { WelcomePage } from './features/welcome/WelcomePage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/receiving" element={<ReceivingPage />} />
        <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/purchase-orders/:number" element={<PODetailPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/receipts/:number" element={<ReceiptDetailPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/discrepancies" element={<DiscrepanciesPage />} />
        <Route path="/outbox" element={<OutboxPage />} />
        <Route path="/activity" element={<ActivityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
