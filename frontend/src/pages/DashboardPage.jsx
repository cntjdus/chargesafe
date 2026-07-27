import { useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import {
  Activity,
  Thermometer,
  Zap,
} from "lucide-react";
import Sidebar from "../components/dashboard/Sidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import SummarySection from "../components/dashboard/SummarySection";
import ChargeStatusCard from "../components/dashboard/ChargeStatusCard";
import SensorCard from "../components/dashboard/SensorCard";
import AIRecommendationCard from "../components/dashboard/AIRecommendationCard";
import EmergencyAlert from "../components/dashboard/EmergencyAlert";
import { dashboardTheme } from "../styles/dashboardTheme";

const DashboardPage = ({ onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");

  return (
    <ThemeProvider theme={dashboardTheme}>
      <PageContainer>
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed((previous) => !previous)}
          selectedMenu={selectedMenu}
          onSelectMenu={setSelectedMenu}
        />

        <MainArea $isCollapsed={isCollapsed}>
          <DashboardHeader onLogout={onLogout} />

          <DashboardContent>
            <SummarySection />

            <MainGrid>
              <ChargeStatusCard />

              <RightContent>
                <SensorGrid>
                  <SensorCard
                    icon={Thermometer}
                    value="32"
                    unit="°C"
                    label="온도"
                    valueColor="#E76408"
                    iconColor="#EF851A"
                    iconBackground="#FFF5E9"
                    progress={55}
                    progressColor="#F0B15C"
                  />

                  <SensorCard
                    icon={Zap}
                    value="1.2"
                    unit="A"
                    label="전류"
                    valueColor="#5267F3"
                    iconColor="#5272F7"
                    iconBackground="#EEF3FF"
                    progress={28}
                    progressColor="#80A7F6"
                  />

                  <SensorCard
                    icon={Activity}
                    value="12.4"
                    unit="V"
                    label="전압"
                    valueColor="#6249E9"
                    iconColor="#7357EC"
                    iconBackground="#F1EFFF"
                    progress={84}
                    progressColor="#9D8CF1"
                  />
                </SensorGrid>

                <AIRecommendationCard />

                <EmergencyAlert />
              </RightContent>
            </MainGrid>
          </DashboardContent>
        </MainArea>
      </PageContainer>
    </ThemeProvider>
  );
};

export default DashboardPage;

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
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
  grid-template-columns: minmax(350px, 470px) minmax(0, 1fr);
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;