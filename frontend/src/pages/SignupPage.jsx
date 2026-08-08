import styled from "styled-components";

import BrandPanel from "../components/login/BrandPanel";
import SignupForm from "../components/signup/SignupForm";

const SignupPage = ({
  onBackToLogin,
  onSignupNext,
}) => {
  return (
    <PageContainer>
      <LeftSection>
        <BrandPanel />
      </LeftSection>

      <RightSection>
        <SignupForm
          onBackToLogin={onBackToLogin}
          onNext={onSignupNext}
        />
      </RightSection>
    </PageContainer>
  );
};

export default SignupPage;

const PageContainer = styled.main`
  display: grid;
  grid-template-columns: 46% 54%;

  width: 100%;
  min-height: 100vh;

  background: #ffffff;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const LeftSection = styled.section`
  min-height: 100vh;

  @media (max-width: 900px) {
    display: none;
  }
`;

const RightSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 100vh;

  padding: 48px 70px;

  background: #fbfcfe;

  @media (max-width: 900px) {
    padding: 36px 24px;
  }
`;