import styled from "styled-components";

function FeatureItem({ icon: Icon, children }) {
  return (
    <FeatureBox>
      {Icon && <Icon size={18} strokeWidth={1.9} />}
      <span>{children}</span>
    </FeatureBox>
  );
}

export default FeatureItem;

const FeatureBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 166px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.075);
  font-size: 14px;
  font-weight: 600;
`;