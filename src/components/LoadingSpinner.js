import React from 'react';

/**
 * LoadingSpinner Component
 * 
 * A customizable loading spinner for React applications
 * 
 * @param {Object} props
 * @param {string} [props.size='md'] - Size of the spinner: 'sm', 'md', 'lg'
 * @param {string} [props.color='#3B82F6'] - Color of the spinner
 * @param {string} [props.thickness='4px'] - Border thickness of the spinner
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.label='Loading...'] - Accessibility label (also displayed if showLabel is true)
 * @param {boolean} [props.showLabel=false] - Whether to show the loading text
 * @returns {JSX.Element} Spinner Component
 */
const LoadingSpinner = ({
  size = 'md',
  color = '#3B82F6',
  thickness = '4px',
  className = '',
  label = 'Loading...',
  showLabel = false,
}) => {
  // Size mapping for the spinner
  const sizeMap = {
    sm: {
      width: '1.5rem',
      height: '1.5rem',
    },
    md: {
      width: '2.5rem',
      height: '2.5rem',
    },
    lg: {
      width: '3.5rem',
      height: '3.5rem',
    },
  };

  const spinnerStyle = {
    display: 'inline-block',
    borderRadius: '50%',
    borderTop: `${thickness} solid ${color}`,
    borderRight: `${thickness} solid transparent`,
    borderBottom: `${thickness} solid transparent`,
    borderLeft: `${thickness} solid transparent`,
    animation: 'spin 1s linear infinite',
    ...sizeMap[size],
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  };

  // Add keyframes to the document head
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={containerStyle} className={className} role="status" aria-live="polite">
      <div style={spinnerStyle} aria-hidden="true"></div>
      {showLabel && <span>{label}</span>}
      {!showLabel && <span className="sr-only">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
