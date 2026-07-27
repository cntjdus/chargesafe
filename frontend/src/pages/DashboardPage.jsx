import { useEffect, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { Activity, Thermometer, Zap } from "lucide-react";

import AIRecommendationCard from "../components/dashboard/AIRecommendationCard";
import ChargeStatusCard from "../components/dashboard/ChargeStatusCard";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import EmergencyAlert from "../components/dashboard/EmergencyAlert";
import SensorCard from "../components/dashboard/SensorCard";
import Sidebar from "../components/dashboard/Sidebar";
import SummarySection from "../components/dashboard/SummarySection";

import CallConfirmModal from "../components/emergency/CallConfirmModal";
import EmergencyGuideModal from "../components/emergency/EmergencyGuideModal";
import EmergencyModal from "../components/emergency/EmergencyModal";

import { dashboardTheme } from "../styles/dashboardTheme";

const MOCK_DASHBOARD_DATA = {
  deviceId: "CS-0042",
  chargingStatus: "충전 중",
  chargePercent: 63,
  targetPercent: 85,

  completionTime: "11:28",
  completionPeriod: "오전",
  remainingTime: "1:47",

  batteryHealth: 87,
  aiConfidence: 94,

  temperature: {
    value: 32,
    unit: "°C",
    status: "정상",
    progress: 55,
  },

  current: {
    value: 1.2,
    unit: "A",
    status: "정상",
    progress: 28,
  },

  voltage: {
    value: 12.4,
    unit: "V",
    status: "정상",
    progress: 84,
  },

  aiRecommendation: {
    recommendedPercent: 85,
    message:
      "내일 이동에는 85% 충전으로 충분합니다. 배터리 보호를 위해 85%에서 자동 종료합니다.",
  },

  emergencyAlert: {
    exists: true,
    count: 1,
    title: "배터리 온도 초과",
    time: "오전 2:14",
    level: "위험",
    temperature: 57,
  },

  guardian: {
    name: "김보호",
    relation: "딸",
    phoneNumber: "010-1234-5678",
  },

  user: {
    name: "김철수",
    role: "관리자",
  },
};

const DashboardPage = ({ onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /*
   * null: 모든 긴급 모달 닫힘
   * main: 긴급 경보 모달
   * guide: 긴급 대처 안내
   * call: 전화 확인 모달
   */
  const [emergencyView, setEmergencyView] = useState(null);

  /*
   * 전화 확인 모달에서 취소했을 때
   * 어느 화면으로 돌아갈지 저장
   */
  const [callPreviousView, setCallPreviousView] = useState("main");

  useEffect(() => {
    const mockTimer = setTimeout(() => {
      setDashboardData(MOCK_DASHBOARD_DATA);
      setIsLoading(false);
    }, 500);

    return () => {
      clearTimeout(mockTimer);
    };
  }, []);

  const handleEmergencyOpen = () => {
    setEmergencyView("main");
  };

  const handleEmergencyClose = () => {
    setEmergencyView(null);
  };

  const handleDeviceCheck = () => {
    setSelectedMenu("devices");
    setEmergencyView(null);
  };

  const handleGuardianCallOpen = () => {
    setCallPreviousView("main");
    setEmergencyView("call");
  };

  const handleGuideOpen = () => {
    setEmergencyView("guide");
  };

  const handleGuideEmergencyCall = () => {
    setCallPreviousView("guide");
    setEmergencyView("call");
  };

  const handleCallCancel = () => {
    setEmergencyView(callPreviousView);
  };

  const handleCall = () => {
    const phoneNumber =
      dashboardData?.guardian?.phoneNumber?.replaceAll("-", "") ?? "";

    if (!phoneNumber) {
      alert("등록된 보호자 전화번호가 없습니다.");
      return;
    }

    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <ThemeProvider theme={dashboardTheme}>
      <PageContainer>
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() =>
            setIsCollapsed((previous) => !previous)
          }
          selectedMenu={selectedMenu}
          onSelectMenu={setSelectedMenu}
          deviceId={dashboardData?.deviceId}
          chargePercent={dashboardData?.chargePercent}
          chargingStatus={dashboardData?.chargingStatus}
          onEmergencyClick={handleEmergencyOpen}
        />

        <MainArea $isCollapsed={isCollapsed}>
          <DashboardHeader
            user={dashboardData?.user}
            onLogout={onLogout}
          />

          <DashboardContent>
            {isLoading && (
              <StateBox>
                대시보드 데이터를 불러오는 중입니다.
              </StateBox>
            )}

            {dashboardData && (
              <>
                <SummarySection data={dashboardData} />

                <MainGrid>
                  <ChargeStatusCard
                    chargePercent={dashboardData.chargePercent}
                    targetPercent={dashboardData.targetPercent}
                    completionTime={dashboardData.completionTime}
                    completionPeriod={
                      dashboardData.completionPeriod
                    }
                    remainingTime={dashboardData.remainingTime}
                    chargingStatus={
                      dashboardData.chargingStatus
                    }
                  />

                  <RightContent>
                    <SensorGrid>
                      <SensorCard
                        icon={Thermometer}
                        value={
                          dashboardData.temperature?.value
                        }
                        unit={
                          dashboardData.temperature?.unit
                        }
                        label="온도"
                        status={
                          dashboardData.temperature?.status
                        }
                        progress={
                          dashboardData.temperature?.progress
                        }
                        valueColor="#E76408"
                        iconColor="#EF851A"
                        iconBackground="#FFF5E9"
                        progressColor="#F0B15C"
                      />

                      <SensorCard
                        icon={Zap}
                        value={dashboardData.current?.value}
                        unit={dashboardData.current?.unit}
                        label="전류"
                        status={dashboardData.current?.status}
                        progress={
                          dashboardData.current?.progress
                        }
                        valueColor="#5267F3"
                        iconColor="#5272F7"
                        iconBackground="#EEF3FF"
                        progressColor="#80A7F6"
                      />

                      <SensorCard
                        icon={Activity}
                        value={dashboardData.voltage?.value}
                        unit={dashboardData.voltage?.unit}
                        label="전압"
                        status={dashboardData.voltage?.status}
                        progress={
                          dashboardData.voltage?.progress
                        }
                        valueColor="#6249E9"
                        iconColor="#7357EC"
                        iconBackground="#F1EFFF"
                        progressColor="#9D8CF1"
                      />
                    </SensorGrid>

                    <AIRecommendationCard
                      confidence={dashboardData.aiConfidence}
                      recommendedPercent={
                        dashboardData.aiRecommendation
                          ?.recommendedPercent
                      }
                      message={
                        dashboardData.aiRecommendation?.message
                      }
                      batteryHealth={
                        dashboardData.batteryHealth
                      }
                    />

                    <EmergencyAlert
                      alert={dashboardData.emergencyAlert}
                      onClick={handleEmergencyOpen}
                    />
                  </RightContent>
                </MainGrid>
              </>
            )}
          </DashboardContent>
        </MainArea>

        {emergencyView === "main" && dashboardData && (
          <EmergencyModal
            temperature={
              dashboardData.emergencyAlert?.temperature
            }
            onClose={handleEmergencyClose}
            onCheckDevice={handleDeviceCheck}
            onContactGuardian={handleGuardianCallOpen}
            onOpenGuide={handleGuideOpen}
          />
        )}

        {emergencyView === "guide" && (
          <EmergencyGuideModal
            onBack={() => setEmergencyView("main")}
            onEmergencyCall={handleGuideEmergencyCall}
          />
        )}

        {emergencyView === "call" && dashboardData && (
          <CallConfirmModal
            guardianName={dashboardData.guardian?.name}
            relation={dashboardData.guardian?.relation}
            phoneNumber={
              dashboardData.guardian?.phoneNumber
            }
            onCancel={handleCallCancel}
            onCall={handleCall}
          />
        )}
      </PageContainer>
    </ThemeProvider>
  );
};

export default DashboardPage;

const PageContainer = styled.div`
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

const DashboardContent = styled.main`
  padding: 22px;

  @media (max-width: 768px) {
    padding: 14px;
  }
`;

const MainGrid = styled.section`
  display: grid;
  grid-template-columns:
    minmax(350px, 470px)
    minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

const RightContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SensorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(
    3,
    minmax(0, 1fr)
  );
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const StateBox = styled.div`
  padding: 40px;
  border-radius: 18px;
  color: #738099;
  background: #ffffff;
  text-align: center;
`;