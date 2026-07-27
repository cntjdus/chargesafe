import styled, { keyframes } from "styled-components";
import { BatteryCharging } from "lucide-react";

const SplashPage = () => {
  return (
    <SplashContainer>
      <TopCircle />
      <BottomCircle />

      <SplashContent>
        <LogoBox>
          <BatteryCharging size={52} strokeWidth={2.6} />
        </LogoBox>

        <ServiceName>ChargeSafe</ServiceName>
        <Description>전동휠체어 배터리 안전 관리</Description>

        <LoadingDots>
          <Dot $delay="0s" />
          <Dot $delay="0.2s" />
          <Dot $delay="0.4s" />
        </LoadingDots>
      </SplashContent>
    </SplashContainer>
  );
};

export default SplashPage;

const SplashContainer = styled.main`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(145deg, #506df5 0%, #5274f5 45%, #4051d8 100%);
`;

const SplashContent = styled.section`
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
  width: 118px;
  height: 118px;
  margin-bottom: 29px;
  border-radius: 34px;
  color: #5271f4;
  background-color: #ffffff;
`;

const ServiceName = styled.h1`
  margin-bottom: 8px;
  color: #ffffff;
  font-size: 54px;
  font-weight: 800;
`;

const Description = styled.p`
  color: rgba(255, 255, 255, 0.72);
  font-size: 18px;
  font-weight: 600;
`;

const dotAnimation = keyframes`
  0%, 80%, 100% {
    opacity: 0.4;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-5px);
  }
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 9px;
  margin-top: 44px;
`;

const Dot = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.58);
  animation: ${dotAnimation} 1.2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
`;

const TopCircle = styled.div`
  position: absolute;
  top: -170px;
  right: -110px;
  width: 310px;
  height: 310px;
  border-radius: 50%;
  background: rgba(112, 148, 255, 0.23);
`;

const BottomCircle = styled.div`
  position: absolute;
  bottom: -160px;
  left: -145px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(113, 143, 255, 0.27);
`;