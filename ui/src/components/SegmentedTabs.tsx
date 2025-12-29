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
        border: '1px solid #E2E8F0',
        backgroundColor: '#F1F5F9',
        px: 0.75,
        py: 0.6,
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
        gap: 0.75,
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
              px: { xs: 1.8, md: 2.6 },
              py: 0.8,
              transition: 'all 0.2s ease',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              color: isActive ? '#0F172A' : '#64748B',
              fontWeight: isActive ? 700 : 600,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              border: isActive ? '1px solid #2563EB' : '1px solid transparent',
              boxShadow: isActive ? '0 6px 16px rgba(37, 99, 235, 0.15)' : 'none',
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
