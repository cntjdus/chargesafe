import { useEffect, useState } from "react";
import styled from "styled-components";
import { Activity, Thermometer, Zap } from "lucide-react";

import AIRecommendationCard from "../components/dashboard/AIRecommendationCard";
import ChargeStatusCard from "../components/dashboard/ChargeStatusCard";
import EmergencyAlert from "../components/dashboard/EmergencyAlert";
import SensorCard from "../components/dashboard/SensorCard";
import SummarySection from "../components/dashboard/SummarySection";

const MOCK_DASHBOARD_DATA = {
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
  },
};

const DashboardPage = ({ onEmergencyClick }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDashboardData(MOCK_DASHBOARD_DATA);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingBox>대시보드 데이터를 불러오는 중입니다.</LoadingBox>;
  }

  if (!dashboardData) {
    return <LoadingBox>대시보드 데이터가 없습니다.</LoadingBox>;
  }

  return (
    <DashboardContent>
      <SummarySection data={dashboardData} />

      <MainGrid>
        <ChargeStatusCard
          chargePercent={dashboardData.chargePercent}
          targetPercent={dashboardData.targetPercent}
          completionTime={dashboardData.completionTime}
          completionPeriod={dashboardData.completionPeriod}
          remainingTime={dashboardData.remainingTime}
          chargingStatus={dashboardData.chargingStatus}
        />

        <RightContent>
          <SensorGrid>
            <SensorCard
              icon={Thermometer}
              value={dashboardData.temperature.value}
              unit={dashboardData.temperature.unit}
              label="온도"
              status={dashboardData.temperature.status}
              progress={dashboardData.temperature.progress}
              valueColor="#E76408"
              iconColor="#EF851A"
              iconBackground="#FFF5E9"
              progressColor="#F0B15C"
            />

            <SensorCard
              icon={Zap}
              value={dashboardData.current.value}
              unit={dashboardData.current.unit}
              label="전류"
              status={dashboardData.current.status}
              progress={dashboardData.current.progress}
              valueColor="#5267F3"
              iconColor="#5272F7"
              iconBackground="#EEF3FF"
              progressColor="#80A7F6"
            />

            <SensorCard
              icon={Activity}
              value={dashboardData.voltage.value}
              unit={dashboardData.voltage.unit}
              label="전압"
              status={dashboardData.voltage.status}
              progress={dashboardData.voltage.progress}
              valueColor="#6249E9"
              iconColor="#7357EC"
              iconBackground="#F1EFFF"
              progressColor="#9D8CF1"
            />
          </SensorGrid>

          <AIRecommendationCard
            confidence={dashboardData.aiConfidence}
            recommendedPercent={
              dashboardData.aiRecommendation.recommendedPercent
            }
            message={dashboardData.aiRecommendation.message}
            batteryHealth={dashboardData.batteryHealth}
          />

          <EmergencyAlert
            alert={dashboardData.emergencyAlert}
            onClick={onEmergencyClick}
          />
        </RightContent>
      </MainGrid>
    </DashboardContent>
  );
};

export default DashboardPage;

const DashboardContent = styled.div`
  width: 100%;
  padding: 22px;

  @media (max-width: 768px) {
    padding: 14px;
  }
`;

const MainGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(350px, 470px) minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const RightContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`;

const SensorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingBox = styled.div`
  margin: 22px;
  padding: 50px;
  border-radius: 18px;
  color: #758197;
  background: #ffffff;
  text-align: center;
`;