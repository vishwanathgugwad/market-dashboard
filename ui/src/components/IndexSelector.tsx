import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

export interface IndexOption {
  key: string;
  label: string;
}

interface IndexSelectorProps {
  options: IndexOption[];
  selected: string;
  onChange: (indexKey: string) => void;
}

const IndexSelector = ({ options, selected, onChange }: IndexSelectorProps) => {
  const handleChange = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (value) {
      onChange(value);
    }
  };

  return (
    <ToggleButtonGroup
      color="primary"
      exclusive
      value={selected}
      onChange={handleChange}
      sx={{ flexWrap: 'wrap' }}
    >
      {options.map((option) => (
        <ToggleButton key={option.key} value={option.key} sx={{ px: 2, py: 1, textTransform: 'none' }}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default IndexSelector;
