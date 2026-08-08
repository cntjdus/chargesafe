import { useState } from "react";
import styled from "styled-components";
import {
  BatteryCharging,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import LoginInput from "./LoginInput";

const LoginForm = ({ onLoginSuccess, onSignupClick }) => {
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.userId.trim()) {
      alert("아이디를 입력해주세요.");
      return;
    }

    if (!formData.password.trim()) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    console.log("로그인 정보", formData);
    console.log("onLoginSuccess:", onLoginSuccess);

    onLoginSuccess?.();
  };

  const handleGuardianLogin = () => {
    console.log("보호자 로그인");
  };

  return (
    <FormContainer>
      <Header>
        <Title>로그인</Title>
        <Description>계정에 로그인하여 기기를 관리하세요</Description>
      </Header>

      <Form onSubmit={handleSubmit}>
        <LoginInput
          label="아이디"
          name="userId"
          type="text"
          placeholder="아이디를 입력하세요"
          icon={UserRound}
          value={formData.userId}
          onChange={handleChange}
          autoComplete="username"
        />

        <LoginInput
          label="비밀번호"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="비밀번호를 입력하세요"
          icon={LockKeyhole}
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          rightIcon={
            <PasswordButton
              type="button"
              aria-label={
                showPassword ? "비밀번호 숨기기" : "비밀번호 보기"
              }
              onClick={() => setShowPassword((previous) => !previous)}
            >
              {showPassword ? (
                <EyeOff size={20} strokeWidth={1.8} />
              ) : (
                <Eye size={20} strokeWidth={1.8} />
              )}
            </PasswordButton>
          }
        />

        <LoginButton type="submit">
          <BatteryCharging size={19} strokeWidth={2.2} />
          로그인
        </LoginButton>

        <GuardianButton type="button" onClick={handleGuardianLogin}>
          <Heart size={19} strokeWidth={2} />
          보호자로 로그인
        </GuardianButton>
      </Form>

      <LinkMenu>
        <MenuButton type="button">아이디 찾기</MenuButton>
        <Divider />
        <MenuButton type="button">비밀번호 재설정</MenuButton>
        <Divider />
        <SignupButton type="button" onClick={onSignupClick}>
          회원가입
        </SignupButton>
      </LinkMenu>
    </FormContainer>
  );
};

export default LoginForm;

const FormContainer = styled.div`
  width: 100%;
  max-width: 470px;
`;

const Header = styled.header`
  margin-bottom: 38px;
`;

const Title = styled.h2`
  margin-bottom: 7px;
  color: #1e293b;
  font-size: 34px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -1.2px;

  @media (max-width: 768px) {
    font-size: 30px;
  }
`;

const Description = styled.p`
  color: #8996aa;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.3px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const PasswordButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  color: #9da9bd;
  background: transparent;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #536df2;
  }
`;

const LoginButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  height: 55px;
  margin-top: 1px;
  border-radius: 21px;
  color: #ffffff;
  background: linear-gradient(100deg, #526ef4 0%, #4a5ee5 100%);
  box-shadow: 0 10px 22px rgba(71, 91, 224, 0.24);
  font-size: 16px;
  font-weight: 750;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 13px 27px rgba(71, 91, 224, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GuardianButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 55px;
  margin-top: -2px;
  border: 1px solid #e0e5ed;
  border-radius: 21px;
  color: #364152;
  background-color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;

  svg {
    color: #ff687c;
  }

  &:hover {
    border-color: #cdd5e2;
    background-color: #fafbfc;
  }
`;

const LinkMenu = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 29px;
`;

const MenuButton = styled.button`
  padding: 2px;
  color: #9aa6b8;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: #5f6c80;
  }
`;

const SignupButton = styled(MenuButton)`
  color: #536df2;
  font-weight: 750;

  &:hover {
    color: #3d54d5;
  }
`;

const Divider = styled.span`
  width: 1px;
  height: 18px;
  background-color: #e1e5eb;
`;