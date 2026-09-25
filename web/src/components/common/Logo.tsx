interface LogoProps {
  /** 'mark' = icon only (sidebar), 'full' = image with wordmark (auth) */
  variant?: 'mark' | 'full';
  /** Height in pixels for the 'full' variant (default 120) */
  height?: number;
}

/**
 * MitMe brand logo.
 * - 'mark'  → /logo-mark.png  (icon only, pairs with CSS "MitMe" text)
 * - 'full'  → /logo.png       (image with wordmark + tagline)
 */
export function Logo({ variant = 'mark', height = 120 }: LogoProps) {
  if (variant === 'full') {
    return (
      <div className="logo logo-full">
        <img
          src="/logo.png"
          alt="MitMe — Connect. Meet. Share."
          style={{ height, width: 'auto' }}
        />
      </div>
    );
  }

  return (
    <div className="logo">
      <div className="brand">
        <img src="/logo-mark.png" alt="MitMe" className="brand-logo" />
        <span className="brand-name">MitMe</span>
      </div>
      <div className="tagline">Connect. Meet. Share.</div>
    </div>
  );
}