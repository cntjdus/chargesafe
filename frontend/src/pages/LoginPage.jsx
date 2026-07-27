import styled from "styled-components";
import BrandPanel from "../components/login/BrandPanel";
import LoginForm from "../components/login/LoginForm";

const LoginPage = () => {
  return (
    <PageContainer>
      <BrandPanel />
      <FormSection>
        <LoginForm />
      </FormSection>
    </PageContainer>
  );
};

export default LoginPage;

const PageContainer = styled.main`
  display: grid;
  grid-template-columns: 1fr 1.18fr;
  width: 100%;
  min-height: 100vh;
  background-color: #ffffff;

  @media (max-width: 1024px) {
    grid-template-columns: 0.9fr 1.1fr;
  }

  @media (max-width: 768px) {
    display: block;
  }
`;

const FormSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 48px 32px;
  background-color: #ffffff;

  @media (max-width: 768px) {
    min-height: auto;
    padding: 56px 24px;
  }
`;