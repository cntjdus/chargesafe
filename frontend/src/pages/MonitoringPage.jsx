import styled from "styled-components";
import {
  Activity,
  BatteryCharging,
} from "lucide-react";

const MonitoringPage = ({ selectedDevice }) => {
  return (
    <PageContainer>
      <ContentCard>
        <IconBox>
          <Activity size={30} />
        </IconBox>

        <Title>모니터링</Title>

        {selectedDevice ? (
          <>
            <DeviceName>
              {selectedDevice.name}
            </DeviceName>

            <DeviceInfo>
              <BatteryCharging size={17} />
              배터리 {selectedDevice.battery}%
            </DeviceInfo>

            <Description>
              {selectedDevice.id} 기기의 실시간 센서 정보를
              표시할 예정입니다.
            </Description>
          </>
        ) : (
          <Description>
            모니터링할 기기를 선택해주세요.
          </Description>
        )}
      </ContentCard>
    </PageContainer>
  );
};

export default MonitoringPage;

const PageContainer = styled.div`
  padding: 22px;
`;

const ContentCard = styled.section`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 70px 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: #ffffff;
  text-align: center;
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  border-radius: 22px;
  color: #ffffff;
  background: #4d63f5;
`;

const Title = styled.h2`
  margin-top: 18px;
  color: #1d2639;
  font-size: 24px;
  font-weight: 850;
`;

const DeviceName = styled.h3`
  margin-top: 20px;
  color: #273249;
  font-size: 18px;
`;

const DeviceInfo = styled.p`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  color: #5369f3;
  font-size: 14px;
  font-weight: 750;
`;

const Description = styled.p`
  margin-top: 13px;
  color: #8794aa;
  font-size: 13px;
`;