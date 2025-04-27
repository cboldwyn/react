import React from 'react';

const ErrorMessage = ({ message }) => {
  return (
    <div style={{
      padding: '1rem',
      margin: '1rem 0',
      backgroundColor: '#ffebee',
      color: '#c62828',
      borderRadius: '4px',
      border: '1px solid #ef9a9a'
    }}>
      <p style={{ margin: 0 }}>
        {message || 'An error occurred. Please try again later.'}
      </p>
    </div>
  );
};


export default ErrorMessage;
