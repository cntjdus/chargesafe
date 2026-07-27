import styled from "styled-components";

const SummaryCard = ({
  icon: Icon,
  title,
  value,
  description,
  iconColor,
  iconBackground,
}) => {
  return (
    <Card>
      <IconBox
        $iconColor={iconColor}
        $iconBackground={iconBackground}
      >
        <Icon size={25} strokeWidth={2} />
      </IconBox>

      <TextArea>
        <Title>{title}</Title>
        <Value>{value}</Value>
        <Description>{description}</Description>
      </TextArea>
    </Card>
  );
};

export default SummaryCard;

const Card = styled.article`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  height: 99px;
  padding: 0 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(30, 44, 74, 0.05);
  cursor: pointer;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: #cfd8ff;
    box-shadow: 0 10px 24px rgba(39, 58, 102, 0.12);
  }
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  color: ${({ $iconColor }) => $iconColor};
  background: ${({ $iconBackground }) => $iconBackground};
  transition: transform 0.22s ease;

  ${Card}:hover & {
    transform: scale(1.07);
  }
`;

const TextArea = styled.div`
  min-width: 0;
`;

const Title = styled.p`
  color: #647289;
  font-size: 13px;
  font-weight: 650;
`;

const Value = styled.strong`
  display: block;
  margin: 1px 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 25px;
  font-weight: 850;
  line-height: 1.1;
`;

const Description = styled.p`
  overflow: hidden;
  color: #8f9bb0;
  font-size: 11px;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
`;