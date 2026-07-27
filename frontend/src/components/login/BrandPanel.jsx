import styled from "styled-components";
import {
  Activity,
  BatteryCharging,
  Cpu,

  Phone,
  ShieldCheck,
} from "lucide-react";
import FeatureItem from "./FeatureItem.jsx";

const BrandPanel = () => {
  return (
    <Panel>
      <TopCircle />
      <BottomCircle />

      <BrandContent>
        <LogoBox>
          <BatteryCharging size={45} strokeWidth={2.5} />
        </LogoBox>

        <BrandName>ChargeSafe</BrandName>

        <BrandDescription>
          전동휠체어 배터리를 안전하게 관리하고, 보호자
          <br />
          와 실시간으로 연결하세요.
        </BrandDescription>

        <FeatureGrid>
          <FeatureItem icon={ShieldCheck}>안전 모니터링</FeatureItem>
          <FeatureItem icon={Cpu}>AI 충전 추천</FeatureItem>
          <FeatureItem icon={Phone}>보호자 연동</FeatureItem>
          <FeatureItem icon={Activity}>실시간 데이터</FeatureItem>
        </FeatureGrid>
      </BrandContent>
    </Panel>
  );
};

export default BrandPanel;

const Panel = styled.section`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
  padding: 48px 32px;
  background:
    radial-gradient(
      circle at 45% 45%,
      rgba(98, 132, 255, 0.85) 0%,
      rgba(72, 100, 241, 0.4) 35%,
      rgba(60, 77, 219, 0.05) 70%
    ),
    linear-gradient(145deg, #506df5 0%, #4d6cf2 47%, #3e4ed5 100%);

  @media (max-width: 768px) {
    min-height: 470px;
    padding: 60px 24px;
  }
`;

const BrandContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
`;

const LogoBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  margin-bottom: 30px;
  border-radius: 28px;
  color: #5271f4;
  background-color: #ffffff;
  box-shadow: 0 18px 40px rgba(29, 45, 145, 0.14);

  @media (max-width: 768px) {
    width: 84px;
    height: 84px;
    margin-bottom: 22px;
    border-radius: 24px;
  }
`;

const BrandName = styled.h1`
  margin-bottom: 14px;
  color: #ffffff;
  font-size: clamp(35px, 3vw, 46px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -1.5px;
`;

const BrandDescription = styled.p`
  color: rgba(255, 255, 255, 0.74);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.75;
  letter-spacing: -0.3px;

  @media (max-width: 1024px) {
    font-size: 15px;
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 166px);
  gap: 16px;
  margin-top: 50px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 154px);
    gap: 12px;
  }

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

const TopCircle = styled.div`
  position: absolute;
  top: -115px;
  right: -95px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: rgba(118, 154, 255, 0.22);
`;

const BottomCircle = styled.div`
  position: absolute;
  bottom: -135px;
  left: -125px;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background: rgba(119, 148, 255, 0.27);
`;
