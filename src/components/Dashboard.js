import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import Papa from 'papaparse';
// Removed the unused lodash import (_)
import { parseISO, getISOWeek, getYear, isValid } from 'date-fns';
// Removed the unused format import

// Utility function to handle date parsing with better error handling
const getWeekNumber = (dateStr) => {
  try {
    // Handle various date formats
    let date;
    if (typeof dateStr === 'string') {
      // Try various date formats
      date = parseISO(dateStr);
      
      // If invalid, try alternative parsing methods
      if (!isValid(date)) {
        // Check for MM/DD/YYYY format
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
          // Try different date arrangements
          const potentialDates = [
            new Date(parts[2], parts[0] - 1, parts[1]), // MM/DD/YYYY
            new Date(parts[2], parts[1] - 1, parts[0]), // DD/MM/YYYY
            new Date(`${parts[2]}-${parts[0]}-${parts[1]}`) // Try ISO format YYYY-MM-DD
          ];
          
          // Find the first valid date
          date = potentialDates.find(d => isValid(d));
        }
      }
    } else {
      date = new Date(dateStr);
    }
    
    // If still invalid after all attempts, throw error
    if (!date || !isValid(date)) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    
    // Get week number and year
    const weekNum = getISOWeek(date);
    const year = getYear(date);
    
    // Format to ensure proper sorting (pad with leading zero if needed)
    const paddedWeek = weekNum.toString().padStart(2, '0');
    return `${year}-W${paddedWeek}`;
  } catch (err) {
    console.error('Error parsing date:', dateStr, err);
    return null; // Return null instead of 'Unknown' for better filtering
  }
};

// A11y-friendly color palette
const colors = {
  shipped: '#2E7D32', // Darker green for better contrast
  received: '#1565C0', // Darker blue for better contrast
  laborHours: '#F57F17', // Darker amber for better contrast
  efficiency: '#6A1B9A', // Darker purple for better contrast
  stores: [
    '#C62828', '#AD1457', '#6A1B9A', '#4527A0', '#283593', 
    '#1565C0', '#0277BD', '#00838F', '#00695C', '#2E7D32',
    '#558B2F', '#9E9D24', '#F9A825', '#FF8F00', '#EF6C00',
    '#D84315', '#4E342E', '#424242', '#37474F', '#000000'
  ]
};

// CSV data fetching function with better error handling
const fetchCSVData = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            // Check if errors are fatal
            const fatalErrors = results.errors.filter(e => e.type === 'Fatal');
            if (fatalErrors.length > 0) {
              reject(new Error(`Error parsing CSV: ${fatalErrors[0].message}`));
            } else {
              // Non-fatal errors - log but continue
              console.warn('Non-fatal CSV parsing issues:', results.errors);
              resolve(results.data);
            }
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`Error fetching CSV from ${url}:`, error);
    throw error;
  }
};

// Separated charts into individual components
const EfficiencyChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="week" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="totalCasesPerLaborHour" 
        name="Total Cases Per Labor Hour" 
        stroke={colors.efficiency} 
        strokeWidth={2} 
        activeDot={{ r: 8 }}
      />
    </LineChart>
  </ResponsiveContainer>
);

const LaborVsCasesChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="week" />
      <YAxis yAxisId="left" />
      <YAxis yAxisId="right" orientation="right" />
      <Tooltip />
      <Legend />
      <Bar 
        yAxisId="left" 
        dataKey="received" 
        name="Cases Received" 
        fill={colors.received} 
        stackId="cases" 
      />
      <Bar 
        yAxisId="left" 
        dataKey="shipped" 
        name="Cases Shipped" 
        fill={colors.shipped} 
        stackId="cases" 
      />
      <Line 
        yAxisId="right" 
        type="monotone" 
        dataKey="laborHours" 
        name="Labor Hours" 
        stroke={colors.laborHours} 
        strokeWidth={2} 
      />
    </ComposedChart>
  </ResponsiveContainer>
);

const WeeklyVolumeChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="week" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="received" name="Cases Received" fill={colors.received} />
      <Bar dataKey="shipped" name="Cases Shipped" fill={colors.shipped} />
    </BarChart>
  </ResponsiveContainer>
);

const CumulativeVolumeChart = ({ data }) => {
  const cumulativeData = useMemo(() => {
    return data.map((week, index, array) => {
      // Calculate cumulative values
      const prevData = index > 0 ? array[index - 1] : { cumulativeReceived: 0, cumulativeShipped: 0 };
      return {
        ...week,
        cumulativeReceived: (prevData.cumulativeReceived || 0) + week.received,
        cumulativeShipped: (prevData.cumulativeShipped || 0) + week.shipped
      };
    });
  }, [data]);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={cumulativeData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="cumulativeReceived" 
          name="Cumulative Cases Received" 
          fill={colors.received} 
          stroke={colors.received} 
          fillOpacity={0.3} 
        />
        <Area 
          type="monotone" 
          dataKey="cumulativeShipped" 
          name="Cumulative Cases Shipped" 
          fill={colors.shipped} 
          stroke={colors.shipped} 
          fillOpacity={0.3} 
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const TopStoresChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart 
      data={data}
      layout="vertical"
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis dataKey="store" type="category" width={150} />
      <Tooltip />
      <Legend />
      <Bar dataKey="total" name="Total Cases Shipped" fill={colors.shipped} />
    </BarChart>
  </ResponsiveContainer>
);

const StoresByWeekChart = ({ storeData, allStores }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="week" 
        type="category" 
        allowDuplicatedCategory={false}
      />
      <YAxis />
      <Tooltip />
      <Legend />
      {allStores.map((store, index) => (
        <Line 
          key={store}
          dataKey="cases"
          type="monotone"
          name={store}
          stroke={colors.stores[index % colors.stores.length]}
          dot={false}
          connectNulls={true}
          // Filter data points for this specific store
          data={storeData.filter(d => d.store === store)}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

// Move dataUrls outside the component to prevent it from being recreated on every render
const DATA_URLS = {
  products: '/data/Products2.csv',
  salesOrders: '/data/SalesOrder.csv',
  purchaseOrders: '/data/PO.csv',
  clocks: '/data/Clocks.csv'
};

// Main Dashboard Component
const Dashboard = () => {
  // State handling with better organization
  // Store the raw data that will be processed later
  const [rawDataState, setRawDataState] = useState({
    products: null,
    salesOrders: null,
    purchaseOrders: null,
    clocks: null
  });
  
  const [processedData, setProcessedData] = useState({
    casesPerLaborHour: [],
    salesAndPOByWeek: [],
    topStoresByWeek: [],
    allStoresByWeek: [],
    weeks: []
  });
  
  const [loadingState, setLoadingState] = useState({
    loading: true,
    error: null,
    dataProgress: {
      products: false,
      salesOrders: false,
      purchaseOrders: false,
      clocks: false
    }
  });
  
  const [activeTab, setActiveTab] = useState('efficiency');

  // Load a single CSV file with progress tracking
  const loadCSV = useCallback(async (name, url) => {
    try {
      const csvData = await fetchCSVData(url);
      setRawDataState(prev => ({ ...prev, [name]: csvData }));
      setLoadingState(prev => ({
        ...prev, 
        dataProgress: { ...prev.dataProgress, [name]: true }
      }));
      return csvData;
    } catch (error) {
      setLoadingState(prev => ({
        ...prev,
        error: `Error loading ${name} data: ${error.message}`
      }));
      return null;
    }
  }, []);

  // Data processing functions
  const processProductData = useCallback((products) => {
    const productMap = {};
    
    if (!Array.isArray(products)) {
      console.error('Invalid product data format:', products);
      return productMap;
    }
    
    products.forEach(product => {
      // Handle various property naming conventions and validate data
      const productName = product['Product Name'] || product['ProductName'] || product['Name'] || product['Product'];
      const unitsPerCase = parseInt(product['Units Per Case'] || product['UnitsPerCase'] || product['Units'] || '1', 10);
      
      if (productName && !isNaN(unitsPerCase) && unitsPerCase > 0) {
        productMap[productName] = unitsPerCase;
      } else {
        console.warn('Skipping invalid product:', product);
      }
    });
    
    return productMap;
  }, []);

  const processSalesData = useCallback((salesOrders, productMap) => {
    const salesByWeek = {};
    const salesByStoreAndWeek = {};
    
    if (!Array.isArray(salesOrders) || !productMap) {
      console.error('Invalid sales data or product map:', { salesOrders, productMap });
      return { salesByWeek, salesByStoreAndWeek };
    }
    
    salesOrders.forEach(order => {
      // Handle various property naming conventions
      const product = order.Product || order['Product Name'] || order.ProductName;
      const quantity = parseInt(order.Quantity || order.Qty || 0, 10);
      const customer = order.Customer || order.Store || order.Client || 'Unknown';
      const deliveryDate = order['Delivery Date'] || order.DeliveryDate || order.Date;
      
      // Skip if missing essential data
      if (!product || !quantity || !deliveryDate || isNaN(quantity) || quantity <= 0) {
        return;
      }
      
      // Skip if we can't find the product in our product map
      const unitsPerCase = productMap[product];
      if (!unitsPerCase) {
        console.warn(`Product not found in product map: ${product}`);
        return;
      }
      
      const cases = quantity / unitsPerCase;
      
      // Parse the delivery date
      const week = getWeekNumber(deliveryDate);
      if (!week) return;
      
      // Add to total cases shipped by week
      if (!salesByWeek[week]) {
        salesByWeek[week] = 0;
      }
      salesByWeek[week] += cases;
      
      // Add to cases shipped by store by week
      if (!salesByStoreAndWeek[customer]) {
        salesByStoreAndWeek[customer] = {};
      }
      if (!salesByStoreAndWeek[customer][week]) {
        salesByStoreAndWeek[customer][week] = 0;
      }
      salesByStoreAndWeek[customer][week] += cases;
    });
    
    return { salesByWeek, salesByStoreAndWeek };
  }, []);

  const processPurchaseData = useCallback((purchaseOrders, productMap) => {
    const poByWeek = {};
    
    if (!Array.isArray(purchaseOrders) || !productMap) {
      console.error('Invalid purchase order data or product map:', { purchaseOrders, productMap });
      return poByWeek;
    }
    
    purchaseOrders.forEach(po => {
      // Handle various property naming conventions
      const product = po['Product Name'] || po.Product || po.ProductName;
      const quantity = parseInt(po['Purchase Quantity'] || po.Quantity || po.Qty || 0, 10);
      const poDate = po['Purchase Order Date'] || po.PODate || po.Date;
      
      // Skip if missing essential data
      if (!product || !quantity || !poDate || isNaN(quantity) || quantity <= 0) {
        return;
      }
      
      // Skip if we can't find the product in our product map
      const unitsPerCase = productMap[product];
      if (!unitsPerCase) {
        console.warn(`Product not found in product map: ${product}`);
        return;
      }
      
      const cases = quantity / unitsPerCase;
      
      // Parse the purchase order date
      const week = getWeekNumber(poDate);
      if (!week) return;
      
      // Add to total cases received by week
      if (!poByWeek[week]) {
        poByWeek[week] = 0;
      }
      poByWeek[week] += cases;
    });
    
    return poByWeek;
  }, []);

  const processClockData = useCallback((clocks) => {
    const laborHoursByWeek = {};
    
    if (!Array.isArray(clocks)) {
      console.error('Invalid clock data:', clocks);
      return laborHoursByWeek;
    }
    
    clocks.forEach(clock => {
      // Handle various property naming conventions
      const dateIn = clock['Date In'] || clock.DateIn || clock.Date;
      const laborHours = parseFloat(clock['Total Less Break'] || clock.TotalLessBreak || clock.Hours || 0);
      
      // Skip if missing essential data
      if (!dateIn || isNaN(laborHours) || laborHours <= 0) {
        return;
      }
      
      const week = getWeekNumber(dateIn);
      if (!week) return;
      
      if (!laborHoursByWeek[week]) {
        laborHoursByWeek[week] = 0;
      }
      laborHoursByWeek[week] += laborHours;
    });
    
    return laborHoursByWeek;
  }, []);

  const calculateMetrics = useCallback((products, salesOrders, purchaseOrders, clocks) => {
    try {
      // Create product lookup map
      const productMap = processProductData(products);
      if (Object.keys(productMap).length === 0) {
        throw new Error('No valid products found');
      }
      
      // Process sales orders
      const { salesByWeek, salesByStoreAndWeek } = processSalesData(salesOrders, productMap);
      if (Object.keys(salesByWeek).length === 0) {
        console.warn('No valid sales orders found');
      }
      
      // Process purchase orders
      const poByWeek = processPurchaseData(purchaseOrders, productMap);
      if (Object.keys(poByWeek).length === 0) {
        console.warn('No valid purchase orders found');
      }
      
      // Process labor hours
      const laborHoursByWeek = processClockData(clocks);
      if (Object.keys(laborHoursByWeek).length === 0) {
        console.warn('No valid clock data found');
      }
      
      // Combine all weeks from both sales and POs and sort them chronologically
      const allWeeks = [...new Set([
        ...Object.keys(salesByWeek), 
        ...Object.keys(poByWeek),
        ...Object.keys(laborHoursByWeek)
      ])].sort((a, b) => {
        // Extract year and week numbers for proper numerical comparison
        const [yearA, weekA] = a.split('-W');
        const [yearB, weekB] = b.split('-W');
        
        // Compare years first
        if (yearA !== yearB) {
          return parseInt(yearA) - parseInt(yearB);
        }
        // Then compare week numbers
        return parseInt(weekA) - parseInt(weekB);
      });
      
      // Early exit if no valid weeks
      if (allWeeks.length === 0) {
        throw new Error('No valid data weeks found');
      }
      
      // Calculate metrics
      const casesPerLaborHourByWeek = {};
      allWeeks.forEach(week => {
        const receivedCases = poByWeek[week] || 0;
        const shippedCases = salesByWeek[week] || 0;
        const laborHours = laborHoursByWeek[week] || 0;
        
        casesPerLaborHourByWeek[week] = {
          week,
          receivedCases,
          shippedCases,
          laborHours,
          totalCasesPerLaborHour: laborHours > 0 ? (receivedCases + shippedCases) / laborHours : 0
        };
      });
      
      // Format data for charts
      const formattedWeeklyData = allWeeks.map(week => ({
        week,
        received: poByWeek[week] || 0,
        shipped: salesByWeek[week] || 0,
        laborHours: laborHoursByWeek[week] || 0,
        totalCasesPerLaborHour: casesPerLaborHourByWeek[week]?.totalCasesPerLaborHour || 0
      }));
      
      // Process data for store analysis
      const storeTotal = {};
      Object.keys(salesByStoreAndWeek).forEach(store => {
        storeTotal[store] = Object.values(salesByStoreAndWeek[store]).reduce((sum, cases) => sum + cases, 0);
      });
      
      // Sort stores by total volume
      const allStores = Object.keys(storeTotal).sort((a, b) => storeTotal[b] - storeTotal[a]);
      const topStores = allStores.slice(0, 10);
      
      // Format top stores data
      const topStoresData = topStores.map(store => ({
        store,
        total: storeTotal[store]
      }));
      
      // Prepare all store data for the LineChart
      const allStoreData = [];
      allWeeks.forEach(week => {
        allStores.forEach(store => {
          allStoreData.push({
            week,
            cases: salesByStoreAndWeek[store]?.[week] || 0,
            store
          });
        });
      });
      
      return {
        casesPerLaborHour: Object.values(casesPerLaborHourByWeek),
        salesAndPOByWeek: formattedWeeklyData,
        topStoresByWeek: topStoresData,
        allStoreData,
        allStores,
        weeks: allWeeks
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      throw error;
    }
  }, [processProductData, processSalesData, processPurchaseData, processClockData]);

  // Load data with sequential processing to improve performance
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingState(prev => ({ ...prev, loading: true, error: null }));
        
        // Load products first (needed for other calculations)
        const products = await loadCSV('products', DATA_URLS.products);
        if (!products) return; // Stop if products failed to load
        
        // Load remaining data in parallel
        const [salesOrders, purchaseOrders, clocks] = await Promise.all([
          loadCSV('salesOrders', DATA_URLS.salesOrders),
          loadCSV('purchaseOrders', DATA_URLS.purchaseOrders),
          loadCSV('clocks', DATA_URLS.clocks)
        ]);
        
        // Check if all data was loaded successfully
        if (!salesOrders || !purchaseOrders || !clocks) return;
        
        // Process data
        const result = calculateMetrics(products, salesOrders, purchaseOrders, clocks);
        setProcessedData(result);
        setLoadingState(prev => ({ ...prev, loading: false }));
      } catch (err) {
        setLoadingState(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Error processing data: ${err.message}` 
        }));
      }
    };
    
    loadData();
  }, [loadCSV, calculateMetrics]);

  // Memoized derived data for performance
  const topStoresData = useMemo(() => {
    return processedData.topStoresByWeek || [];
  }, [processedData.topStoresByWeek]);

  // Handle tab changes
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Render loading state
  if (loadingState.loading) {
    return (
      <div className="flex justify-center items-center h-screen" role="status" aria-live="polite">
        <div className="text-center">
          <div className="text-xl mb-4">Loading dashboard data...</div>
          <div className="h-8 w-8 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mx-auto"></div>
          <div className="mt-4">
            {Object.entries(loadingState.dataProgress).map(([key, loaded]) => (
              <div key={key} className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 ${loaded ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>{key}: {loaded ? 'Loaded' : 'Loading...'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (loadingState.error) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-50" role="alert">
        <div className="text-center text-red-600 p-6 bg-white shadow-lg rounded-lg max-w-lg">
          <div className="text-xl font-bold mb-4">Error Loading Dashboard</div>
          <div className="whitespace-pre-wrap text-left">{loadingState.error}</div>
          <button 
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header with ARIA role */}
      <header className="bg-blue-600 text-white p-4 shadow-md" role="banner">
        <h1 className="text-2xl font-bold">Logistics Performance Dashboard</h1>
      </header>
      
      {/* Navigation tabs with accessibility attributes */}
      <nav className="flex mb-4 bg-white shadow-md mt-4 mx-4" role="navigation" aria-label="Dashboard Sections">
        <button 
          className={`px-6 py-3 ${activeTab === 'efficiency' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
          onClick={() => handleTabChange('efficiency')}
          aria-pressed={activeTab === 'efficiency'}
          aria-controls="efficiency-panel"
        >
          Efficiency Metrics
        </button>
        <button 
          className={`px-6 py-3 ${activeTab === 'volume' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
          onClick={() => handleTabChange('volume')}
          aria-pressed={activeTab === 'volume'}
          aria-controls="volume-panel"
        >
          Volume by Week
        </button>
        <button 
          className={`px-6 py-3 ${activeTab === 'stores' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
          onClick={() => handleTabChange('stores')}
          aria-pressed={activeTab === 'stores'}
          aria-controls="stores-panel"
        >
          Store Analysis
        </button>
      </nav>
      
      {/* Main content */}
      <main className="flex-grow p-4 overflow-auto">
        {/* Efficiency Metrics Panel */}
        <div 
          id="efficiency-panel" 
          role="tabpanel" 
          aria-labelledby="efficiency-tab"
          className={`grid grid-cols-1 gap-6 ${activeTab !== 'efficiency' ? 'hidden' : ''}`}
        >
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Cases Handled Per Labor Hour</h2>
            <div className="h-96" aria-label="Line chart showing cases handled per labor hour by week">
              <EfficiencyChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Labor Hours vs. Cases Handled</h2>
            <div className="h-96" aria-label="Chart comparing labor hours against cases received and shipped">
              <LaborVsCasesChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
        </div>
        
        {/* Volume by Week Panel */}
        <div 
          id="volume-panel" 
          role="tabpanel" 
          aria-labelledby="volume-tab"
          className={`grid grid-cols-1 gap-6 ${activeTab !== 'volume' ? 'hidden' : ''}`}
        >
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Cases Shipped and Received by Week</h2>
            <div className="h-96" aria-label="Bar chart showing cases shipped and received by week">
              <WeeklyVolumeChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Cumulative Cases Handled</h2>
            <div className="h-96" aria-label="Area chart showing cumulative cases handled over time">
              <CumulativeVolumeChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
        </div>
        
        {/* Store Analysis Panel */}
        <div 
          id="stores-panel" 
          role="tabpanel" 
          aria-labelledby="stores-tab"
          className={`grid grid-cols-1 gap-6 ${activeTab !== 'stores' ? 'hidden' : ''}`}
        >
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Top 10 Stores by Total Cases Shipped</h2>
            <div className="h-96" aria-label="Horizontal bar chart showing top 10 stores by cases shipped">
              <TopStoresChart data={topStoresData} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Cases Handled Per Labor Hour</h2>
            <div className="h-96" aria-label="Line chart showing cases handled per labor hour by week">
              <EfficiencyChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Labor Hours vs. Cases Handled</h2>
            <div className="h-96" aria-label="Chart comparing labor hours against cases received and shipped">
              <LaborVsCasesChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
        </div>
        
        {/* Volume by Week Panel */}
        <div 
          id="volume-panel" 
          role="tabpanel" 
          aria-labelledby="volume-tab"
          className={`grid grid-cols-1 gap-6 ${activeTab !== 'volume' ? 'hidden' : ''}`}
        >
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Cases Shipped and Received by Week</h2>
            <div className="h-96" aria-label="Bar chart showing cases shipped and received by week">
              <WeeklyVolumeChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Cumulative Cases Handled</h2>
            <div className="h-96" aria-label="Area chart showing cumulative cases handled over time">
              <CumulativeVolumeChart data={processedData.salesAndPOByWeek} />
            </div>
          </div>
        </div>
        
        {/* Store Analysis Panel */}
        <div 
          id="stores-panel" 
          role="tabpanel" 
          aria-labelledby="stores-tab"
          className={`grid grid-cols-1 gap-6 ${activeTab !== 'stores' ? 'hidden' : ''}`}
        >
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Top 10 Stores by Total Cases Shipped</h2>
            <div className="h-96" aria-label="Horizontal bar chart showing top 10 stores by cases shipped">
              <TopStoresChart data={topStoresData} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow-md">
<h2 className="text-lg font-semibold mb-4">Cases Shipped by Store by Week</h2>
            <div className="h-96" aria-label="Line chart showing cases shipped by store over time">
              <StoresByWeekChart 
                storeData={processedData.allStoreData} 
                allStores={processedData.allStores} 
              />
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer with last updated info */}
      <footer className="bg-gray-200 p-4 text-center text-sm text-gray-600">
        <div>Last updated: {new Date().toLocaleString()}</div>
        <div className="mt-1">Data Source: Warehouse Management System</div>
      </footer>
    </div>
  );
};

// Main component with error boundary
class DashboardWithErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error information
    console.error('Dashboard error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="flex justify-center items-center h-screen bg-red-50" role="alert">
          <div className="text-center text-red-600 p-6 bg-white shadow-lg rounded-lg max-w-lg">
            <div className="text-xl font-bold mb-4">Dashboard Error</div>
            <div className="whitespace-pre-wrap text-left overflow-auto max-h-64">
              {this.state.error?.toString()}
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Error Details</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40 bg-gray-100 p-2 rounded">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            </div>
            <button 
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={() => window.location.reload()}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    // If there's no error, render the Dashboard component as normal
    return <Dashboard />;
  }
}

export default DashboardWithErrorBoundary;          
