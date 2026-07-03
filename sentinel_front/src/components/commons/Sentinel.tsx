import Logo from "@/assets/icons/sentinel-logo.svg?react";

export default function Sentinel() {
    return( <div style={{
    fontSize: '18px',
    fontWeight: 'bold',
    letterSpacing: '3px',
    marginBottom: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }}>
    <Logo style={{ width: 20, height: 20, fill: 'var(--color-primary)' }} />
    <span style={{ color: 'var(--color-text-primary)' }}>
      SEN<span style={{ color: 'var(--color-primary)' }}>TIN</span>EL
    </span>
  </div>)
 }
