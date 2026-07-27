import { useState } from "react";
import styled, { ThemeProvider } from "styled-components";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import Sidebar from "../components/dashboard/Sidebar";

import CallConfirmModal from "../components/emergency/CallConfirmModal";
import EmergencyGuideModal from "../components/emergency/EmergencyGuideModal";
import EmergencyModal from "../components/emergency/EmergencyModal";

import { dashboardTheme } from "../styles/dashboardTheme";

import ChargingHistoryPage from "./ChargingHistoryPage";
import DashboardPage from "./DashboardPage";
import DeviceManagementPage from "./DeviceManagementPage";
import MonitoringPage from "./MonitoringPage";

const MOCK_COMMON_DATA = {
  deviceId: "CS-0042",
  chargePercent: 63,
  chargingStatus: "충전 중",

  user: {
    name: "김철수",
    role: "관리자",
  },

  guardian: {
    name: "김보호",
    relation: "딸",
    phoneNumber: "010-1234-5678",
  },
};

const MainPage = ({ onLogout }) => {
  const [isCollapsed, setIsCollapsed] =
    useState(false);

  const [selectedMenu, setSelectedMenu] =
    useState("dashboard");

  const [selectedMonitoringDevice, setSelectedMonitoringDevice] =
    useState(null);

  const [emergencyView, setEmergencyView] =
    useState(null);

  const [callPreviousView, setCallPreviousView] =
    useState("main");

  const handleToggleSidebar = () => {
    setIsCollapsed((previous) => !previous);
  };

  const handleSelectMenu = (menuId) => {
    setSelectedMenu(menuId);

    if (menuId !== "monitoring") {
      setSelectedMonitoringDevice(null);
    }
  };

  const handleEmergencyOpen = () => {
    setEmergencyView("main");
  };

  const handleNavigateMonitoring = (device) => {
    setSelectedMonitoringDevice(device);
    setSelectedMenu("monitoring");
  };

  const getPageTitle = () => {
    switch (selectedMenu) {
      case "monitoring":
        return "모니터링";

      case "history":
        return "충전 이력";

      case "notifications":
        return "알림 센터";

      case "devices":
        return "기기 관리";

      case "settings":
        return "설정";

      case "dashboard":
      default:
        return "대시보드";
    }
  };

  const renderPageContent = () => {
    switch (selectedMenu) {
      case "monitoring":
        return (
          <MonitoringPage
            selectedDevice={selectedMonitoringDevice}
          />
        );

      case "history":
        return <ChargingHistoryPage />;

      case "devices":
        return (
          <DeviceManagementPage
            onNavigateMonitoring={
              handleNavigateMonitoring
            }
          />
        );

      case "notifications":
        return (
          <EmptyPage>
            알림 센터 페이지를 준비 중입니다.
          </EmptyPage>
        );

      case "settings":
        return (
          <EmptyPage>
            설정 페이지를 준비 중입니다.
          </EmptyPage>
        );

      case "dashboard":
      default:
        return (
          <DashboardPage
            onEmergencyClick={handleEmergencyOpen}
          />
        );
    }
  };

  const handleCall = () => {
    const phoneNumber =
      MOCK_COMMON_DATA.guardian.phoneNumber.replaceAll(
        "-",
        ""
      );

    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <ThemeProvider theme={dashboardTheme}>
      <Layout>
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={handleToggleSidebar}
          selectedMenu={selectedMenu}
          onSelectMenu={handleSelectMenu}
          deviceId={MOCK_COMMON_DATA.deviceId}
          chargePercent={
            MOCK_COMMON_DATA.chargePercent
          }
          chargingStatus={
            MOCK_COMMON_DATA.chargingStatus
          }
          onEmergencyClick={handleEmergencyOpen}
        />

        <MainArea $isCollapsed={isCollapsed}>
          <DashboardHeader
            title={getPageTitle()}
            showLiveText={
              selectedMenu === "dashboard"
            }
            user={MOCK_COMMON_DATA.user}
            onLogout={onLogout}
          />

          <PageContent>
            {renderPageContent()}
          </PageContent>
        </MainArea>

        {emergencyView === "main" && (
          <EmergencyModal
            temperature={57}
            onClose={() => setEmergencyView(null)}
            onCheckDevice={() => {
              setSelectedMenu("devices");
              setEmergencyView(null);
            }}
            onContactGuardian={() => {
              setCallPreviousView("main");
              setEmergencyView("call");
            }}
            onOpenGuide={() => {
              setEmergencyView("guide");
            }}
          />
        )}

        {emergencyView === "guide" && (
          <EmergencyGuideModal
            onBack={() =>
              setEmergencyView("main")
            }
            onEmergencyCall={() => {
              setCallPreviousView("guide");
              setEmergencyView("call");
            }}
          />
        )}

        {emergencyView === "call" && (
          <CallConfirmModal
            guardianName={
              MOCK_COMMON_DATA.guardian.name
            }
            relation={
              MOCK_COMMON_DATA.guardian.relation
            }
            phoneNumber={
              MOCK_COMMON_DATA.guardian.phoneNumber
            }
            onCancel={() =>
              setEmergencyView(callPreviousView)
            }
            onCall={handleCall}
          />
        )}
      </Layout>
    </ThemeProvider>
  );
};

export default MainPage;

const Layout = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) =>
    theme.colors.background};
`;

const MainArea = styled.div`
  min-height: 100vh;
  margin-left: ${({ $isCollapsed }) =>
    $isCollapsed ? "64px" : "214px"};
  transition: margin-left 0.3s ease;
`;

const PageContent = styled.main`
  width: 100%;
  min-height: calc(100vh - 56px);
`;

const EmptyPage = styled.div`
  margin: 22px;
  padding: 60px;
  border: 1px solid
    ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  color: #7d899e;
  background: #ffffff;
  text-align: center;
`;