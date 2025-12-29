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
        borderColor: 'divider',
        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 0.9),
        px: 0.75,
        py: 0.6,
        boxShadow: theme.shadows[2],
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
              backgroundColor: isActive ? theme.palette.background.paper : 'transparent',
              color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
              fontWeight: isActive ? 700 : 600,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              border: isActive ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent',
              boxShadow: isActive ? theme.shadows[3] : 'none',
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
