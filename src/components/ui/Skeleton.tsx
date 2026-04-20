export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse bg-white/5 ${className}`}
      style={style}
    />
  );
}
