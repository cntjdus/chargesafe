import styled from "styled-components";

const LoginInput = ({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  rightIcon,
  value,
  onChange,
  name,
  autoComplete,
}) => {
  return (
    <InputGroup>
      <Label htmlFor={name}>{label}</Label>

      <InputWrapper>
        <LeftIcon>
          <Icon size={20} strokeWidth={1.8} />
        </LeftIcon>

        <Input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />

        {rightIcon && <RightIcon>{rightIcon}</RightIcon>}
      </InputWrapper>
    </InputGroup>
  );
};

export default LoginInput;

const InputGroup = styled.div`
  width: 100%;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 10px;
  color: #40506a;
  font-size: 15px;
  font-weight: 700;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const LeftIcon = styled.span`
  position: absolute;
  left: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9eabc1;
  pointer-events: none;
`;

const Input = styled.input`
  width: 100%;
  height: 55px;
  padding: 0 52px 0 50px;
  border: 1px solid #e1e6ee;
  border-radius: 21px;
  outline: none;
  color: #263247;
  background-color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &::placeholder {
    color: #bdc6d5;
  }

  &:focus {
    border-color: #5572f4;
    box-shadow: 0 0 0 4px rgba(82, 108, 241, 0.1);
  }
`;

const RightIcon = styled.span`
  position: absolute;
  right: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
`;