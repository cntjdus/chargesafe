import styled from "styled-components";

const ToggleSwitch = ({
  checked,
  onChange,
  ariaLabel,
}) => {
  return (
    <SwitchButton
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      $checked={checked}
      onClick={(event) => {
        event.stopPropagation();
        onChange?.(!checked);
      }}
    >
      <SwitchHandle $checked={checked} />
    </SwitchButton>
  );
};

export default ToggleSwitch;

const SwitchButton = styled.button`
  position: relative;
  flex-shrink: 0;
  width: 47px;
  height: 25px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: ${({ $checked }) =>
    $checked ? "#5877f6" : "#e4e9f1"};
  cursor: pointer;
  transition:
    background 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.18s ease;

  &:hover {
    background: ${({ $checked }) =>
      $checked ? "#4667ed" : "#d7deea"};
    box-shadow: 0 4px 10px
      ${({ $checked }) =>
        $checked
          ? "rgba(75, 102, 236, 0.24)"
          : "rgba(75, 89, 114, 0.13)"};
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 2px solid #5975f6;
    outline-offset: 3px;
  }
`;

const SwitchHandle = styled.span`
  position: absolute;
  top: 3px;
  left: ${({ $checked }) => ($checked ? "25px" : "3px")};
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(33, 44, 69, 0.24);
  transition: left 0.22s ease;
`;