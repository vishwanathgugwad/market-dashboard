import { Box, ButtonBase, Typography } from '@mui/material';

export interface SegmentedTabOption {
  key: string;
  label: string;
}

interface SegmentedTabsProps {
  options: SegmentedTabOption[];
  value: string;
  onChange: (key: string) => void;
}

const SegmentedTabs = ({ options, value, onChange }: SegmentedTabsProps) => {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        border: '1px solid #d1d5db',
        backgroundColor: '#ffffff',
        px: 1,
        py: 0.5,
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
        gap: 0.5,
      }}
    >
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <ButtonBase
            key={option.key}
            onClick={() => onChange(option.key)}
            sx={{
              borderRadius: 999,
              px: { xs: 2, md: 3 },
              py: 1,
              transition: 'all 0.2s ease',
              backgroundColor: isActive ? '#0f172a' : 'transparent',
              color: isActive ? '#ffffff' : '#0f172a',
              fontWeight: isActive ? 800 : 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            <Typography variant="body2">{option.label}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
};

export default SegmentedTabs;
