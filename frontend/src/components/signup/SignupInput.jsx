import styled from "styled-components";

import {
  CheckCircle2,
} from "lucide-react";

const SignupInput = ({
  label,
  icon: Icon,
  rightIcon,
  isValid = false,
  ...inputProps
}) => {
  return (
    <Field>
      <Label>{label}</Label>

      <InputWrapper $isValid={isValid}>
        {Icon && (
          <LeftIcon>
            <Icon
              size={18}
              strokeWidth={1.8}
            />
          </LeftIcon>
        )}

        <Input {...inputProps} />

        {isValid ? (
          <ValidIcon>
            <CheckCircle2
              size={20}
              strokeWidth={1.8}
            />
          </ValidIcon>
        ) : (
          rightIcon && (
            <RightIcon>{rightIcon}</RightIcon>
          )
        )}
      </InputWrapper>
    </Field>
  );
};

export default SignupInput;

const Field = styled.div`
  width: 100%;
`;

const Label = styled.label`
  display: block;

  margin-bottom: 9px;

  color: #354158;

  font-size: 13px;
  font-weight: 750;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;

  width: 100%;
  height: 46px;

  padding: 0 14px;

  border: 1.5px solid
    ${({ $isValid }) =>
      $isValid ? "#77d58a" : "#e0e5ed"};

  border-radius: 17px;

  background: #ffffff;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus-within {
    border-color: #7190ff;

    box-shadow: 0 0 0 3px
      rgba(83, 109, 242, 0.08);
  }
`;

const LeftIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;

  flex-shrink: 0;

  margin-right: 11px;

  color: #9eabc0;
`;

const Input = styled.input`
  width: 100%;
  min-width: 0;

  border: none;
  outline: none;

  color: #222c3f;

  background: transparent;

  font-size: 13px;
  font-weight: 550;

  &::placeholder {
    color: #c3cad7;
  }
`;

const RightIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;

  flex-shrink: 0;

  margin-left: 8px;
`;

const ValidIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;

  flex-shrink: 0;

  color: #55d371;
`;