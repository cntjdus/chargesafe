import styled from "styled-components";

const filters = [
  {
    id: "all",
    label: "전체",
  },
  {
    id: "danger",
    label: "위험",
  },
  {
    id: "warning",
    label: "주의",
  },
  {
    id: "success",
    label: "완료",
  },
  {
    id: "info",
    label: "정보",
  },
];

const NotificationFilter = ({
  selectedFilter,
  onChangeFilter,
}) => {
  return (
    <FilterList>
      {filters.map((filter) => (
        <FilterButton
          key={filter.id}
          type="button"
          $isSelected={selectedFilter === filter.id}
          onClick={() => onChangeFilter(filter.id)}
        >
          {filter.label}
        </FilterButton>
      ))}
    </FilterList>
  );
};

export default NotificationFilter;

const FilterList = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const FilterButton = styled.button`
  min-width: 48px;
  height: 33px;
  padding: 0 14px;
  border: 1px solid
    ${({ $isSelected }) =>
      $isSelected ? "#4d63f5" : "#e0e5ed"};
  border-radius: 17px;
  color: ${({ $isSelected }) =>
    $isSelected ? "#ffffff" : "#425066"};
  background: ${({ $isSelected }) =>
    $isSelected ? "#4d63f5" : "#ffffff"};
  box-shadow: ${({ $isSelected }) =>
    $isSelected
      ? "0 5px 11px rgba(77, 99, 245, 0.2)"
      : "none"};
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    color: ${({ $isSelected }) =>
      $isSelected ? "#ffffff" : "#4d63f5"};
    border-color: #aebcff;
    background: ${({ $isSelected }) =>
      $isSelected ? "#4055e8" : "#f4f6ff"};
    transform: translateY(-1px);
  }
`;