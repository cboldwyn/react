# Logistics Dashboard

A React-based dashboard for visualizing logistics performance data including cases handled per labor hour, weekly volume, and store analysis.

## Features

- **Efficiency Metrics:** Visualize cases handled per labor hour and compare labor hours to volume.
- **Volume by Week:** Track weekly shipments and receipts with cumulative charts.
- **Store Analysis:** Compare performance across all stores and identify top performers.

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/logistics-dashboard.git
cd logistics-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open in your browser at http://localhost:3000.

### CSV Data Files

Place your CSV files in the `src/data` directory:
- `Products2.csv` - Product information with units per case
- `SalesOrder.csv` - Sales order data
- `PO.csv` - Purchase order data
- `Clocks.csv` - Employee labor hour data

## Deployment

### Building for Production

Build the app for production:
```bash
npm run build
```

### Deploying to Netlify

1. Install the Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Log in to Netlify:
```bash
netlify login
```

3. Deploy to Netlify:
```bash
netlify deploy --prod
```

Alternatively, connect your GitHub repository to Netlify for continuous deployment.

## Project Structure

```
logistics-dashboard/
├── public/                # Public assets
├── src/                   # Source code
│   ├── components/        # React components
│   │   └── Dashboard.js   # Main dashboard component
│   ├── data/              # CSV data files
│   ├── App.js             # Main application component
│   └── index.js           # Application entry point
└── README.md              # Project documentation
```

## Customization

- Modify the color scheme in `Dashboard.js` by updating the `colors` object
- Add additional metrics by extending the data processing functions
- Customize chart types in the render section of `Dashboard.js`

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.