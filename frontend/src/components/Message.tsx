interface MessageProps {
  type: 'ok' | 'error' | 'info';
  text: string;
}

export default function Message({ type, text }: MessageProps) {
  const classes = {
    ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    error: 'border-red-500/30 bg-red-500/10 text-red-100',
    info: 'border-cinema-gold/30 bg-cinema-gold/10 text-cinema-cream'
  }[type];

  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${classes}`}>{text}</div>;
}
