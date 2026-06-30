import { useEffect, useState } from 'react';

interface MessageProps {
  type: 'ok' | 'error' | 'info';
  text: string;
}

export default function Message({ type, text }: MessageProps) {
  const [visible, setVisible] = useState(true);

  const classes = {
    ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    error: 'border-red-500/30 bg-red-500/10 text-red-100',
    info: 'border-cinema-gold/30 bg-cinema-gold/10 text-cinema-cream'
  }[type];

  useEffect(() => {
    if (type === 'ok') {
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [type]);

  if (!visible) return null;

  return <div role={type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${classes}`}>{text}</div>;
}
