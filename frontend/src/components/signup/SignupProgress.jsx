import styled from "styled-components";

const SignupProgress = ({
  progress = 0,
  step = 1,
  totalSteps = 2,
}) => {
  return (
    <ProgressContainer>
      <ProgressTrack>
        <ProgressBar $progress={progress} />
      </ProgressTrack>

      <StepText>
        {step} / {totalSteps}
      </StepText>
    </ProgressContainer>
  );
};

export default SignupProgress;

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  width: 100%;

  margin: 26px 0 30px;
`;

const ProgressTrack = styled.div`
  position: relative;

  flex: 1;

  height: 5px;

  overflow: hidden;

  border-radius: 99px;

  background: #eef1f6;
`;

const ProgressBar = styled.div`
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;

  border-radius: inherit;

  background: #5877f6;

  transition: width 0.3s ease;
`;

const StepText = styled.span`
  min-width: 35px;

  color: #97a4bb;

  font-size: 12px;
  font-weight: 750;

  text-align: right;
`;