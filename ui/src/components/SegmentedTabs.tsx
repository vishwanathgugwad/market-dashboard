import { Box, ButtonBase, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

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
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.8),
        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.45 : 0.92),
        px: 0.6,
        py: 0.5,
        boxShadow: theme.shadows[2],
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
              px: { xs: 1.6, md: 2.4 },
              py: 0.7,
              transition: 'all 0.2s ease',
              backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.16) : 'transparent',
              color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
              fontWeight: isActive ? 700 : 600,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              border: isActive ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}` : '1px solid transparent',
              boxShadow: isActive ? theme.shadows[3] : 'none',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, isActive ? 0.2 : 0.12),
              },
            }}
          >
            <Typography variant="caption" sx={{ fontSize: 12 }}>
              {option.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
};

export default SegmentedTabs;
