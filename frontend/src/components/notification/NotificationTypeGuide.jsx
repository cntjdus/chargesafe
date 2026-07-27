import styled from "styled-components";

import NotificationTypeCard from "./NotificationTypeCard";

const NotificationTypeGuide = ({ guides = [] }) => {
  return (
    <GuideList>
      {guides.map((guide) => (
        <NotificationTypeCard
          key={guide.id}
          guide={guide}
        />
      ))}
    </GuideList>
  );
};

export default NotificationTypeGuide;

const GuideList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
`;