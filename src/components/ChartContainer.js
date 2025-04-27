import React from 'react';

const ChartContainer = ({ children, title }) => {
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-content">
        {children}
      </div>
    </div>
  );
};


export default ChartContainer;
