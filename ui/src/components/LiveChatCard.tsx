import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import BoltIcon from '@mui/icons-material/Bolt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ChatMessage {
  id: number;
  sender: 'You' | 'Strategy Bot';
  content: string;
  timestamp: string;
  tone?: 'positive' | 'caution';
}

interface LiveChatCardProps {
  contextLabel: string;
  marketOpen: boolean;
}

const QUICK_PROMPTS = [
  'Summarize the intraday breadth so far',
  'What hedges make sense if momentum flips?',
  'Flag top 3 bullish names and 2 weak ones',
];

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'Strategy Bot',
    content: 'Desk is live. Tracking volatility and breadth skew for the current index. Ask for hedges or entries.',
    timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    tone: 'positive',
  },
  {
    id: 2,
    sender: 'Strategy Bot',
    content: 'Momentum looks constructive above VWAP; spreads are tight. I can suggest staggered exits when momentum cools.',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];

const buildBotResponse = (userText: string, contextLabel: string, marketOpen: boolean) => {
  const normalized = userText.toLowerCase();

  if (normalized.includes('hedge') || normalized.includes('protect')) {
    return `For ${contextLabel}, consider light protection with staggered puts or short futures micro-lots. Size below 0.4% notional and trail if the advance-decline line stays above neutral.`;
  }

  if (normalized.includes('breadth') || normalized.includes('advances') || normalized.includes('declines')) {
    return `Breadth check on ${contextLabel}: advances-to-declines ratio is healthy in the last 15 minutes. If it slips under 0.9, expect momentum to fade and cut risk.`;
  }

  if (normalized.includes('top') || normalized.includes('bullish') || normalized.includes('names')) {
    return `Leaders right now: banking and consumer names are printing higher lows. Avoid metals if ${contextLabel} loses the intraday trend line; keep profit targets tight.`;
  }

  if (normalized.includes('entry') || normalized.includes('exit')) {
    return `Use VWAP ±0.25% as a guide for entries on ${contextLabel}. Scale out into strength if 5-minute RSI crosses 70 or when tape velocity slows.`;
  }

  if (!marketOpen) {
    return `Market is closed, but I can prep. Bias is neutral-to-positive for ${contextLabel}. Set alerts near previous high/low and review gaps at the open.`;
  }

  return `Tracking ${contextLabel}. Momentum is intact; keep risk per trade small and monitor when the advance-decline spread narrows. Ask for hedges, exits, or sector leadership to stay ahead.`;
};

const LiveChatCard = ({ contextLabel, marketOpen }: LiveChatCardProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const liveBadge = useMemo<{ label: string; color: 'default' | 'success' }>(
    () => ({ label: marketOpen ? 'Live market' : 'Market closed', color: marketOpen ? 'success' : 'default' }),
    [marketOpen],
  );

  useEffect(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'Strategy Bot',
        content: `Context switched to ${contextLabel}. I will bias updates to this index until you ask otherwise.`,
        timestamp: new Date().toISOString(),
        tone: 'positive',
      },
    ]);
  }, [contextLabel]);

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();
    const userMessage: ChatMessage = { id: Date.now(), sender: 'You', content: trimmed, timestamp: now };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsResponding(true);

    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'Strategy Bot',
        content: buildBotResponse(trimmed, contextLabel, marketOpen),
        timestamp: new Date().toISOString(),
        tone: trimmed.toLowerCase().includes('hedge') ? 'caution' : 'positive',
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsResponding(false);
    }, 600);
  };

  const setPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <Card sx={{ height: '100%', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Live Chat"
        subheader="Realtime desk support and quick strategy checks"
        titleTypographyProps={{ sx: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 } }}
        subheaderTypographyProps={{ color: 'text.secondary' }}
        action={<Chip size="small" color={liveBadge.color as any} label={liveBadge.label} icon={<BoltIcon fontSize="small" />} />}
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: 'text.secondary' }}>
          <Tooltip title="Connection quality">
            <Chip
              size="small"
              variant="outlined"
              icon={<SignalCellularAltIcon fontSize="small" />}
              label={marketOpen ? 'Channel stable' : 'Awaiting next session'}
            />
          </Tooltip>
          <Tooltip title="Last response latency">
            <Chip size="small" variant="outlined" icon={<AccessTimeIcon fontSize="small" />} label="< 1s" />
          </Tooltip>
          <Typography variant="caption" color="text.secondary">
            Context · {contextLabel}
          </Typography>
        </Stack>

        <Box
          sx={{
            border: '1px solid #e5e7eb',
            bgcolor: '#f8fafc',
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            overflowY: 'auto',
            flex: 1,
            minHeight: 360,
          }}
        >
          {messages.map((message) => {
            const isUser = message.sender === 'You';
            const bubbleColor = isUser ? '#0f172a' : message.tone === 'caution' ? '#fef3c7' : '#ffffff';
            const bubbleBorder = isUser ? '#0f172a' : '#e5e7eb';

            return (
              <Stack
                key={message.id}
                direction="row"
                spacing={1}
                justifyContent={isUser ? 'flex-end' : 'flex-start'}
                alignItems="flex-start"
              >
                {!isUser && <Avatar sx={{ bgcolor: '#0f172a', fontSize: 12 }}>SB</Avatar>}
                <Box
                  sx={{
                    maxWidth: '80%',
                    bgcolor: bubbleColor,
                    color: isUser ? '#ffffff' : '#0f172a',
                    px: 1.5,
                    py: 1.2,
                    borderRadius: 2,
                    border: `1px solid ${bubbleBorder}`,
                    boxShadow: isUser ? '0 8px 24px rgba(15, 23, 42, 0.25)' : 'none',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Typography variant="body2" fontWeight={700} sx={{ color: isUser ? '#c7d2fe' : '#0f172a' }}>
                      {message.sender}
                    </Typography>
                    <Typography variant="caption" color={isUser ? '#e5e7eb' : 'text.secondary'}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {message.content}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
          {isResponding && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ bgcolor: '#0f172a', fontSize: 12 }}>SB</Avatar>
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                  color: 'text.secondary',
                  fontSize: 13,
                  display: 'inline-flex',
                  gap: 0.5,
                }}
              >
                <Box component="span">typing</Box>
                <Box component="span" sx={{ animation: 'blink 1s infinite' }}>
                  ···
                </Box>
              </Box>
            </Stack>
          )}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder="Ask for hedges, exits, or leadership calls..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim()}
            sx={{ bgcolor: '#0f172a', color: '#ffffff', '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' } }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
          {QUICK_PROMPTS.map((prompt) => (
            <Button key={prompt} size="small" variant="outlined" onClick={() => setPrompt(prompt)} sx={{ textTransform: 'none' }}>
              {prompt}
            </Button>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LiveChatCard;
