import { useMemo, useState } from "react";
import styled from "styled-components";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Shield,
  UserRound,
} from "lucide-react";

import SignupInput from "./SignupInput";
import SignupProgress from "./SignupProgress";
import SignupTypeSelector from "./SignupTypeSelector";

const SignupForm = ({
  onBackToLogin,
  onNext,
}) => {
  const [signupType, setSignupType] =
    useState("user");

  const [formData, setFormData] = useState({
    name: "",
    userId: "",
    password: "",
    passwordConfirm: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showPasswordConfirm, setShowPasswordConfirm] =
    useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const isNameValid =
    formData.name.trim().length > 0;

  const isUserIdValid =
    /^[A-Za-z0-9]{4,}$/.test(
      formData.userId
    );

  const isPasswordValid =
    formData.password.length >= 6;

  const isPasswordConfirmValid =
    isPasswordValid &&
    formData.passwordConfirm.length > 0 &&
    formData.password ===
      formData.passwordConfirm;

  const completedCount = [
    isNameValid,
    isUserIdValid,
    isPasswordValid,
    isPasswordConfirmValid,
  ].filter(Boolean).length;

  const progress = useMemo(() => {
    const START_PROGRESS = 45;
    const END_PROGRESS = 100;

    return (
      START_PROGRESS +
      (completedCount / 4) *
        (END_PROGRESS - START_PROGRESS)
    );
  }, [completedCount]);

  const canProceed =
    isNameValid &&
    isUserIdValid &&
    isPasswordValid &&
    isPasswordConfirmValid;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canProceed) {
      return;
    }

    onNext?.({
      signupType,
      ...formData,
    });
  };

  return (
    <FormContainer>
      <Header>
        <Title>회원가입</Title>

        <Description>
          ChargeSafe 계정을 만들어 시작하세요
        </Description>
      </Header>

      <BackButton
        type="button"
        onClick={onBackToLogin}
      >
        <ArrowLeft
          size={16}
          strokeWidth={2}
        />

        로그인으로 돌아가기
      </BackButton>

      <SignupProgress
        progress={progress}
        step={1}
        totalSteps={2}
      />

      <Form onSubmit={handleSubmit}>
        <SignupTypeSelector
          value={signupType}
          onChange={setSignupType}
        />

        <SignupInput
          label="이름"
          name="name"
          type="text"
          icon={UserRound}
          placeholder="실명 입력"
          value={formData.name}
          onChange={handleChange}
          autoComplete="name"
        />

        <SignupInput
          label="아이디"
          name="userId"
          type="text"
          icon={Shield}
          placeholder="영문·숫자 4자 이상"
          value={formData.userId}
          onChange={handleChange}
          isValid={isUserIdValid}
          autoComplete="username"
        />

        <SignupInput
          label="비밀번호"
          name="password"
          type={
            showPassword
              ? "text"
              : "password"
          }
          icon={LockKeyhole}
          placeholder="6자 이상"
          value={formData.password}
          onChange={handleChange}
          isValid={isPasswordValid}
          autoComplete="new-password"
          rightIcon={
            <VisibilityButton
              type="button"
              onClick={() =>
                setShowPassword(
                  (previous) => !previous
                )
              }
              aria-label={
                showPassword
                  ? "비밀번호 숨기기"
                  : "비밀번호 보기"
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </VisibilityButton>
          }
        />

        <SignupInput
          label="비밀번호 확인"
          name="passwordConfirm"
          type={
            showPasswordConfirm
              ? "text"
              : "password"
          }
          icon={LockKeyhole}
          placeholder="비밀번호 재입력"
          value={formData.passwordConfirm}
          onChange={handleChange}
          isValid={isPasswordConfirmValid}
          autoComplete="new-password"
          rightIcon={
            <VisibilityButton
              type="button"
              onClick={() =>
                setShowPasswordConfirm(
                  (previous) => !previous
                )
              }
            >
              {showPasswordConfirm ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </VisibilityButton>
          }
        />

        {formData.passwordConfirm &&
          !isPasswordConfirmValid && (
            <ValidationMessage>
              비밀번호가 일치하지 않습니다.
            </ValidationMessage>
          )}

        <NextButton
          type="submit"
          disabled={!canProceed}
        >
          다음
        </NextButton>
      </Form>
    </FormContainer>
  );
};

export default SignupForm;

const FormContainer = styled.div`
  width: 100%;
  max-width: 440px;
`;

const Header = styled.header``;

const Title = styled.h1`
  margin: 0;

  color: #1e293b;

  font-size: 30px;
  font-weight: 850;
  letter-spacing: -0.9px;
`;

const Description = styled.p`
  margin-top: 7px;

  color: #8491a7;

  font-size: 14px;
  font-weight: 500;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;

  gap: 6px;

  margin-top: 27px;

  border: none;

  color: #657289;

  background: transparent;

  font-size: 12px;
  font-weight: 650;

  cursor: pointer;

  transition:
    color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #5069f4;

    transform: translateX(-2px);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;

  gap: 18px;
`;

const VisibilityButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 2px;

  border: none;

  color: #9da9bd;

  background: transparent;

  cursor: pointer;

  &:hover {
    color: #536df2;
  }
`;

const ValidationMessage = styled.p`
  margin-top: -8px;

  color: #eb595d;

  font-size: 11px;
  font-weight: 600;
`;

const NextButton = styled.button`
  width: 100%;
  height: 48px;

  margin-top: -2px;

  border: none;
  border-radius: 17px;

  color: #ffffff;

  background: ${({ disabled }) =>
    disabled
      ? "#acb9f3"
      : "linear-gradient(100deg, #5877f6 0%, #5063ee 100%)"};

  box-shadow: ${({ disabled }) =>
    disabled
      ? "none"
      : "0 9px 20px rgba(75, 96, 225, 0.22)"};

  font-size: 14px;
  font-weight: 800;

  cursor: ${({ disabled }) =>
    disabled ? "not-allowed" : "pointer"};

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);

    box-shadow:
      0 12px 24px
      rgba(75, 96, 225, 0.28);
  }
`;