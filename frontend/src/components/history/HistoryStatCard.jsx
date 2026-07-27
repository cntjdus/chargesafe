import styled from "styled-components";

const HistoryStatCard = ({
  icon: Icon,
  title,
  value,
  description,
  iconBackground,
}) => {
  return (
    <Card>
      <IconBox $iconBackground={iconBackground}>
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

export default HistoryStatCard;

const Card = styled.article`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  height: 99px;
  padding: 18px 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(29, 42, 72, 0.05);
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;

  &:hover {
    border-color: #cfd8ff;
    box-shadow: 0 10px 24px rgba(39, 55, 94, 0.12);
    transform: translateY(-4px);
  }
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 49px;
  height: 49px;
  border-radius: 17px;
  color: #ffffff;
  background: ${({ $iconBackground }) => $iconBackground};
  transition: transform 0.22s ease;

  ${Card}:hover & {
    transform: scale(1.08);
  }
`;

const TextArea = styled.div`
  min-width: 0;
`;

const Title = styled.p`
  color: #67748b;
  font-size: 13px;
  font-weight: 650;
`;

const Value = styled.strong`
  display: block;
  margin-top: 1px;
  color: #182033;
  font-size: 25px;
  font-weight: 850;
  line-height: 1.15;
`;

const Description = styled.p`
  margin-top: 2px;
  overflow: hidden;
  color: #929db1;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;