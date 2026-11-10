import React from 'react';
import paraniLogoFull from '../assets/logo/parani-logo-2x.png';
import paraniLogoDark from '../assets/logo/parani-logo-darkbg-2x.png';
import paraniEmblem from '../assets/logo/parani-emblem-hd.png';

/**
 * Responsive Logo Component for Parani Mill Stores
 * @param {'full' | 'dark' | 'emblem' | 'card'} variant
 * @param {number | string} height
 * @param {string} className
 * @param {boolean} showTagline
 */
const Logo = ({
  variant = 'full',
  height = 42,
  className = '',
  showTagline = false,
  alt = 'Parani Mill Stores Logo',
}) => {
  if (variant === 'emblem') {
    return (
      <div className={`responsive-logo-emblem-wrap ${className}`}>
        <img
          src={paraniEmblem}
          alt={alt}
          style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
          className="responsive-logo-img emblem-img"
        />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`brand-logo-card ${className}`}>
        <img
          src={paraniLogoFull}
          alt={alt}
          style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
          className="responsive-logo-img"
        />
        {showTagline && (
          <span className="logo-card-tagline">Since 1960 • Admin Portal</span>
        )}
      </div>
    );
  }

  const logoSrc = variant === 'dark' ? paraniLogoDark : paraniLogoFull;

  return (
    <div className={`responsive-logo-container ${className}`}>
      <img
        src={logoSrc}
        alt={alt}
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
        className="responsive-logo-img"
      />
      {showTagline && (
        <span className="logo-sub-text">Since 1960 • Certified Equipment</span>
      )}
    </div>
  );
};

export default Logo;
