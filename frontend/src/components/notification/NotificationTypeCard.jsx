import styled from "styled-components";
import {
  Bell,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
} from "lucide-react";

const NotificationTypeCard = ({ guide }) => {
  const typeStyle = getGuideTypeStyle(guide.type);
  const Icon = typeStyle.icon;

  return (
    <Card $type={guide.type}>
      <CardHeader>
        <IconBox $type={guide.type}>
          <Icon size={22} strokeWidth={2} />
        </IconBox>

        <TypeDot $type={guide.type} />

        <Title $type={guide.type}>
          {guide.title}
        </Title>
      </CardHeader>

      <CardContent>
        <GuideSection>
          <SectionTitle>발송 조건</SectionTitle>
          <Condition>{guide.condition}</Condition>
        </GuideSection>

        <GuideSection>
          <SectionTitle>발송 예시</SectionTitle>

          <ExampleList>
            {guide.examples.map((example) => (
              <ExampleItem
                key={example}
                $type={guide.type}
              >
                {example}
              </ExampleItem>
            ))}
          </ExampleList>
        </GuideSection>

        <GuideSection>
          <SectionTitle>권장 조치</SectionTitle>

          <ActionBox>{guide.action}</ActionBox>
        </GuideSection>
      </CardContent>
    </Card>
  );
};

export default NotificationTypeCard;

const getGuideTypeStyle = (type) => {
  switch (type) {
    case "danger":
      return {
        icon: TriangleAlert,
      };

    case "warning":
      return {
        icon: CircleAlert,
      };

    case "success":
      return {
        icon: CircleCheck,
      };

    case "info":
    default:
      return {
        icon: Bell,
      };
  }
};

const getTypeColors = (type) => {
  switch (type) {
    case "danger":
      return {
        background: "#fff6f5",
        border: "#f5d2d0",
        iconBackground: "#ffe2e0",
        main: "#df4549",
        actionBackground: "#ffffff",
      };

    case "warning":
      return {
        background: "#fffbed",
        border: "#efdca0",
        iconBackground: "#fff2bd",
        main: "#d99700",
        actionBackground: "#ffffff",
      };

    case "success":
      return {
        background: "#f1fbf4",
        border: "#d4ebda",
        iconBackground: "#def6e5",
        main: "#55ac64",
        actionBackground: "#ffffff",
      };

    case "info":
    default:
      return {
        background: "#f1f6ff",
        border: "#d5e2fb",
        iconBackground: "#dfeaff",
        main: "#5d7ff1",
        actionBackground: "#ffffff",
      };
  }
};

const Card = styled.article`
  overflow: hidden;
  border: 1px solid
    ${({ $type }) => getTypeColors($type).border};
  border-radius: 18px;
  background: ${({ $type }) =>
    getTypeColors($type).background};
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    box-shadow: 0 9px 22px rgba(35, 49, 80, 0.09);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.header`
  display: flex;
  align-items: center;
  min-height: 68px;
  padding: 14px 22px;
  border-bottom: 1px solid rgba(131, 145, 169, 0.12);
`;

const IconBox = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 43px;
  height: 43px;
  border-radius: 14px;
  color: ${({ $type }) =>
    getTypeColors($type).main};
  background: ${({ $type }) =>
    getTypeColors($type).iconBackground};
`;

const TypeDot = styled.span`
  width: 10px;
  height: 10px;
  margin-left: 17px;
  border-radius: 50%;
  background: ${({ $type }) =>
    getTypeColors($type).main};
`;

const Title = styled.h3`
  margin-left: 10px;
  color: ${({ $type }) =>
    getTypeColors($type).main};
  font-size: 15px;
  font-weight: 850;
`;

const CardContent = styled.div`
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, 1fr)
    minmax(280px, 1fr);
  gap: 28px;
  padding: 20px 23px 25px;

  @media (max-width: 950px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const GuideSection = styled.section`
  min-width: 0;
`;

const SectionTitle = styled.h4`
  margin-bottom: 10px;
  color: #657289;
  font-size: 11px;
  font-weight: 800;
`;

const Condition = styled.p`
  color: #455168;
  font-size: 11px;
  line-height: 1.75;
`;

const ExampleList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 0;
  list-style: none;
`;

const ExampleItem = styled.li`
  position: relative;
  padding-left: 13px;
  color: #455168;
  font-size: 11px;
  line-height: 1.4;

  &::before {
    position: absolute;
    top: 6px;
    left: 0;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${({ $type }) =>
      getTypeColors($type).main};
    content: "";
  }
`;

const ActionBox = styled.div`
  min-height: 47px;
  padding: 14px 17px;
  border: 1px solid rgba(143, 155, 177, 0.17);
  border-radius: 18px;
  color: #303b50;
  background: rgba(255, 255, 255, 0.75);
  font-size: 11px;
  font-weight: 750;
  line-height: 1.5;
`;