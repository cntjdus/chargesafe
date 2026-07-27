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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");

  const [emergencyView, setEmergencyView] = useState(null);
  const [callPreviousView, setCallPreviousView] = useState("main");

  const handleToggleSidebar = () => {
    setIsCollapsed((previous) => !previous);
  };

  const handleEmergencyOpen = () => {
    setEmergencyView("main");
  };

  const getPageTitle = () => {
    switch (selectedMenu) {
      case "history":
        return "충전 이력";

      case "monitoring":
        return "모니터링";

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
      case "history":
        return <ChargingHistoryPage />;

      case "dashboard":
        return <DashboardPage onEmergencyClick={handleEmergencyOpen} />;

      case "monitoring":
        return <EmptyPage>모니터링 페이지를 준비 중입니다.</EmptyPage>;

      case "notifications":
        return <EmptyPage>알림 센터 페이지를 준비 중입니다.</EmptyPage>;

      case "devices":
        return <EmptyPage>기기 관리 페이지를 준비 중입니다.</EmptyPage>;

      case "settings":
        return <EmptyPage>설정 페이지를 준비 중입니다.</EmptyPage>;

      default:
        return <DashboardPage onEmergencyClick={handleEmergencyOpen} />;
    }
  };

  const handleCall = () => {
    const phoneNumber =
      MOCK_COMMON_DATA.guardian.phoneNumber.replaceAll("-", "");

    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <ThemeProvider theme={dashboardTheme}>
      <Layout>
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={handleToggleSidebar}
          selectedMenu={selectedMenu}
          onSelectMenu={setSelectedMenu}
          deviceId={MOCK_COMMON_DATA.deviceId}
          chargePercent={MOCK_COMMON_DATA.chargePercent}
          chargingStatus={MOCK_COMMON_DATA.chargingStatus}
          onEmergencyClick={handleEmergencyOpen}
        />

        <MainArea $isCollapsed={isCollapsed}>
          <DashboardHeader
            title={getPageTitle()}
            showLiveText={selectedMenu === "dashboard"}
            user={MOCK_COMMON_DATA.user}
            onLogout={onLogout}
          />

          <PageContent>{renderPageContent()}</PageContent>
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
            onBack={() => setEmergencyView("main")}
            onEmergencyCall={() => {
              setCallPreviousView("guide");
              setEmergencyView("call");
            }}
          />
        )}

        {emergencyView === "call" && (
          <CallConfirmModal
            guardianName={MOCK_COMMON_DATA.guardian.name}
            relation={MOCK_COMMON_DATA.guardian.relation}
            phoneNumber={MOCK_COMMON_DATA.guardian.phoneNumber}
            onCancel={() => setEmergencyView(callPreviousView)}
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
  background: ${({ theme }) => theme.colors.background};
`;

const MainArea = styled.div`
  width: auto;
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
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  color: #7d899e;
  background: #ffffff;
  text-align: center;
`;