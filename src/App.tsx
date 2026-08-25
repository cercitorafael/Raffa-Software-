import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { I18nProvider } from './i18n';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { AnalyticsModule } from './components/analytics/AnalyticsModule';
import { POSModule } from './components/pos/POSModule';
import { DocumentsModule } from './components/documents/DocumentsModule';
import { StoresModule } from './components/stores/StoresModule';
import { StockModule } from './components/stock/StockModule';
import { FinanceModule } from './components/finance/FinanceModule';
import { HRModule } from './components/hr/HRModule';
import { ProcurementModule } from './components/procurement/ProcurementModule';
import { CRMModule } from './components/crm/CRMModule';
import { EventBusModule } from './components/events/EventBusModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { SupabaseUserManager } from './components/supabase/SupabaseUserManager';
import { CashShiftModal } from './components/pos/CashShiftModal';
import { OfflineSyncModal } from './components/pos/OfflineSyncModal';
import { PriceCheckerModal } from './components/pos/PriceCheckerModal';
import { FiscalAuditModal } from './components/settings/FiscalAuditModal';
import { EventDrawer } from './components/events/EventDrawer';
import { LoginScreen } from './components/auth/LoginScreen';
import { LockScreen } from './components/auth/LockScreen';
import { ToastContainer } from './components/common/ToastContainer';
import { ConfirmModal } from './components/common/ConfirmModal';

const MainLayout: React.FC = () => {
  const { activeNavTab, showOfflineSyncModal, setShowOfflineSyncModal } = useApp();
  const [showGlobalShiftModal, setShowGlobalShiftModal] = React.useState(false);

  const renderActiveModule = () => {
    switch (activeNavTab) {
      case 'dashboard':
        return <DashboardModule />;
      case 'analytics':
        return <AnalyticsModule />;
      case 'pos':
        return <POSModule />;
      case 'documents':
      case 'orders':
        return <DocumentsModule />;
      case 'stores':
        return <StoresModule />;
      case 'stock':
        return <StockModule />;
      case 'finance':
        return <FinanceModule />;
      case 'hr':
        return <HRModule />;
      case 'procurement':
        return <ProcurementModule />;
      case 'crm':
        return <CRMModule />;
      case 'users':
        return <SettingsModule key="users" initialTab="users" />;
      case 'supabase':
        return <SupabaseUserManager />;
      case 'events':
        return <EventBusModule />;
      case 'settings':
        return <SettingsModule key="settings" initialTab="company" />;
      default:
        return <DashboardModule />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0a0a] text-[#e5e5e5] select-none">
      {/* Top Global Navigation Bar */}
      <Navbar onOpenShiftModal={() => setShowGlobalShiftModal(true)} />

      {/* Main Workspace Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Module Sidebar */}
        <Sidebar />

        {/* Active Module View */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0a0a]">
          {renderActiveModule()}
        </main>
      </div>

      {showGlobalShiftModal && (
        <CashShiftModal onClose={() => setShowGlobalShiftModal(false)} />
      )}

      <OfflineSyncModal
        isOpen={showOfflineSyncModal}
        onClose={() => setShowOfflineSyncModal(false)}
      />

      <PriceCheckerModal />
      <FiscalAuditModal />
      <EventDrawer />
      <ConfirmModal />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isScreenLocked } = useApp();

  return (
    <>
      {!isAuthenticated ? (
        <LoginScreen />
      ) : isScreenLocked ? (
        <LockScreen />
      ) : (
        <MainLayout />
      )}
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </I18nProvider>
  );
}

