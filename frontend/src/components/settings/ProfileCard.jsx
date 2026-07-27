import styled from "styled-components";
import { UserRound } from "lucide-react";

const ProfileCard = ({
  user,
  guardian,
  deviceId,
}) => {
  return (
    <Card>
      <ProfileArea>
        <Avatar>
          <UserRound size={29} strokeWidth={1.8} />
        </Avatar>

        <div>
          <UserName>{user?.name ?? "사용자"}</UserName>
          <UserRole>
            {user?.description ?? "전동휠체어 사용자"}
          </UserRole>
          <DeviceId>
            기기 ID: {deviceId ?? "-"}
          </DeviceId>
        </div>
      </ProfileArea>

      <GuardianBadge>
        <StatusDot />
        보호자 연결됨 ·{" "}
        {guardian?.name ?? "보호자"} (
        {guardian?.relation ?? "가족"})
      </GuardianBadge>
    </Card>
  );
};

export default ProfileCard;

const Card = styled.section`
  padding: 20px;
  border: 1px solid #e0e5ed;
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(32, 45, 74, 0.05);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #ccd7ff;
    box-shadow: 0 9px 21px rgba(36, 51, 84, 0.09);
    transform: translateY(-2px);
  }
`;

const ProfileArea = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Avatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 61px;
  height: 61px;
  border: 1px solid #dfe7ff;
  border-radius: 17px;
  color: #6080f7;
  background: #f1f5ff;
`;

const UserName = styled.h2`
  color: #182236;
  font-size: 17px;
  font-weight: 850;
`;

const UserRole = styled.p`
  margin-top: 5px;
  color: #5d697e;
  font-size: 12px;
`;

const DeviceId = styled.p`
  margin-top: 4px;
  color: #a1aabd;
  font-size: 10px;
`;

const GuardianBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 15px;
  padding: 9px 12px;
  border: 1px solid #d8f0dc;
  border-radius: 15px;
  color: #438a4c;
  background: #f0fbf2;
  font-size: 10px;
  font-weight: 750;
`;

const StatusDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #61cc70;
`;