import styled from "styled-components";

import {
  Heart,
  UserRound,
} from "lucide-react";

const SignupTypeSelector = ({
  value,
  onChange,
}) => {
  return (
    <Container>
      <Label>가입 유형</Label>

      <ButtonGroup>
        <TypeButton
          type="button"
          $selected={value === "user"}
          onClick={() => onChange("user")}
        >
          <UserRound
            size={17}
            strokeWidth={1.9}
          />

          사용자
        </TypeButton>

        <TypeButton
          type="button"
          $selected={value === "guardian"}
          onClick={() => onChange("guardian")}
        >
          <Heart
            size={17}
            strokeWidth={1.9}
          />

          보호자
        </TypeButton>
      </ButtonGroup>
    </Container>
  );
};

export default SignupTypeSelector;

const Container = styled.div`
  width: 100%;
`;

const Label = styled.p`
  margin-bottom: 9px;

  color: #354158;

  font-size: 13px;
  font-weight: 750;
`;

const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  gap: 10px;
`;

const TypeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;

  gap: 8px;

  height: 45px;

  border: 1.5px solid
    ${({ $selected }) =>
      $selected ? "#6685ff" : "#dfe5ed"};

  border-radius: 16px;

  color: ${({ $selected }) =>
    $selected ? "#536df2" : "#68758b"};

  background: ${({ $selected }) =>
    $selected ? "#f2f6ff" : "#ffffff"};

  font-size: 13px;
  font-weight: 750;

  cursor: pointer;

  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #8da3ff;

    background: #f7f9ff;

    transform: translateY(-1px);
  }
`;