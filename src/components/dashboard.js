import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';
import { format, parseISO, getISOWeek, getYear } from 'date-fns';

// Assume we're using webpack/craco file-loader configured for CSV files
// Alternatively, these could be imported dynamically with fetch
import productsCSV from '../data/Products2.csv';
import salesOrderCSV from '../data/SalesOrder.csv';
import purchaseOrderCSV from '../data/PO.csv';
import clocksCSV from '../data/Clocks.csv';

const Dashboard = () => {
  const [data, setData] = useState({
    casesPerLaborHour: [],
    salesAndPOByWeek: [],
    topStoresByWeek: [],
    allStoresByWeek: [],
    weeks: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('efficiency');

  // Color palette with more colors to handle all stores
  const colors = {
    shipped: '#4CAF50',
    received: '#2196F3',
    laborHours: '#FFC107',
    efficiency: '#9C27B0',
    stores: [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', 
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
      '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#000000'
    ]
  };

  useEffect(() => {
    const processData = async () => {
      try {
        setLoading(true);
        
        // Parse CSVs
        const products = await parseCSVFile(productsCSV);
        const salesOrders = await parseCSVFile(salesOrderCSV);
        const purchaseOrders = await parseCSVFile(purchaseOrderCSV);
        const clocks = await parseCSVFile(clocksCSV);
        
        // Process data
        const result = calculateMetrics(products, salesOrders, purchaseOrders, clocks);
        setData(result);
        setLoading(false);
      } catch (err) {
        setError('Error loading data: ' + err.message);
        setLoading(false);
      }
    };
    
    processData();
  }, []);

  // Helper function to parse CSV files
  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            reject(new Error('Error parsing CSV: ' + results.errors[0].message));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  // Extract week number from date
  const getWeekNumber = (dateStr) => {
    try {
      // Handle various date formats
      const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      
      // Get week number and year
      const weekNum = getISOWeek(date);
      const year = getYear(date);
      
      // Format to ensure proper sorting (pad with leading zero if needed)
      const paddedWeek = weekNum.toString().padStart(2, '0');
      return `${year}-W${paddedWeek}`;
    } catch (err) {
      console.error('Error parsing date:', dateStr, err);
      return 'Unknown';
    }
  };

  // Main metrics calculation function
  const calculateMetrics = (products, salesOrders, purchaseOrders, clocks) => {
    // Create a map of product names to units per case for easy lookup
    const productMap = {};
    products.forEach(product => {
      if (product['Product Name']) {
        productMap[product['Product Name']] = product['Units Per Case'] || 1;
      }
    });

    // Process sales orders - calculate cases shipped by week and by store
    const salesByWeek = {};
    const salesByStoreAndWeek = {};

    salesOrders.forEach(order => {
      const product = order.Product;
      const quantity = order.Quantity || 0;
      const customer = order.Customer || 'Unknown';
      
      // Skip if we can't find the product in our product map or it's invalid
      if (!product || !productMap[product]) {
        return;
      }
      
      const unitsPerCase = productMap[product] || 1;
      const cases = quantity / unitsPerCase;
      
      // Parse the delivery date
      const deliveryDate = order['Delivery Date'];
      if (!deliveryDate) return;
      
      const week = getWeekNumber(deliveryDate);
      if (week === 'Unknown') return;
      
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

    // Process purchase orders - calculate cases received by week
    const poByWeek = {};

    purchaseOrders.forEach(po => {
      const product = po['Product Name'];
      const quantity = po['Purchase Quantity'] || 0;
      
      // Skip if we can't find the product in our product map or it's invalid
      if (!product || !productMap[product]) {
        return;
      }
      
      const unitsPerCase = productMap[product] || 1;
      const cases = quantity / unitsPerCase;
      
      // Parse the purchase order date
      const poDate = po['Purchase Order Date'];
      if (!poDate) return;
      
      const week = getWeekNumber(poDate);
      if (week === 'Unknown') return;
      
      // Add to total cases received by week
      if (!poByWeek[week]) {
        poByWeek[week] = 0;
      }
      poByWeek[week] += cases;
    });

    // Calculate labor hours by week
    const laborHoursByWeek = {};

    clocks.forEach(clock => {
      if (!clock['Date In']) return;
      
      const dateIn = clock['Date In'];
      const week = getWeekNumber(dateIn);
      if (week === 'Unknown') return;
      
      // Use Total Less Break as labor hours
      const laborHours = clock['Total Less Break'] || 0;
      
      if (!laborHoursByWeek[week]) {
        laborHoursByWeek[week] = 0;
      }
      laborHoursByWeek[week] += laborHours;
    });

    // Combine all weeks from both sales and POs and sort them chronologically
    const allWeeks = [...new Set([...Object.keys(salesByWeek), ...Object.keys(poByWeek)])].sort((a, b) => {
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

    // Calculate cases per labor hour by week
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
    const storeDataMap = {};
    
    Object.keys(salesByStoreAndWeek).forEach(store => {
      storeTotal[store] = Object.values(salesByStoreAndWeek[store]).reduce((sum, cases) => sum + cases, 0);
      
      // Create weekly data points for each store
      const weeklyData = allWeeks.map(week => ({
        week,
        cases: salesByStoreAndWeek[store]?.[week] || 0,
        store
      }));
      
      storeDataMap[store] = {
        store,
        data: weeklyData,
        total: storeTotal[store]
      };
    });
    
    // Sort stores by total volume for the top stores chart
    const topStores = Object.keys(storeTotal)
      .sort((a, b) => storeTotal[b] - storeTotal[a])
      .slice(0, 10);
      
    // Get all stores for the complete store analysis
    const allStores = Object.keys(storeTotal).sort((a, b) => storeTotal[b] - storeTotal[a]);

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

    // Format the metrics for the dashboard
    return {
      casesPerLaborHour: Object.values(casesPerLaborHourByWeek),
      salesAndPOByWeek: formattedWeeklyData,
      topStoresByWeek: topStores.map(store => storeDataMap[store]),
      allStoresByWeek: allStores.map(store => storeDataMap[store]),
      allStoreData,
      weeks: allWeeks
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="text-xl mb-4">Loading dashboard data...</div>
          <div className="h-8 w-8 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center text-red-600">
          <div className="text-xl mb-4">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Logistics Performance Dashboard</h1>
      </div>
      
      <div className="flex mb-4 bg-white shadow-md mt-4 mx-4">
        <button 
          className={`px-6 py-3 ${activeTab === 'efficiency' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
          onClick={() => setActiveTab('efficiency')}
        >
          Efficiency Metrics
        </button>
        <button 
          className={`px-6 py-3 ${activeTab === 'volume' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
          onClick={() => setActiveTab('volume')}
        >
          Volume by Week
        </button>
        <button 
          className={`px-6 py-3 ${activeTab === 'stores' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
          onClick={() => setActiveTab('stores')}
        >
          Store Analysis
        </button>
      </div>
      
      <div className="flex-grow p-4 overflow-auto">
        {activeTab === 'efficiency' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-4 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Cases Handled Per Labor Hour</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.salesAndPOByWeek}>
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
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Labor Hours vs. Cases Handled</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.salesAndPOByWeek}>
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
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'volume' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-4 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Cases Shipped and Received by Week</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.salesAndPOByWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="received" name="Cases Received" fill={colors.received} />
                    <Bar dataKey="shipped" name="Cases Shipped" fill={colors.shipped} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Cumulative Cases Handled</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={data.salesAndPOByWeek.map((week, index, array) => {
                      // Calculate cumulative values
                      const prevData = index > 0 ? array[index - 1] : { cumulativeReceived: 0, cumulativeShipped: 0 };
                      return {
                        ...week,
                        cumulativeReceived: (prevData.cumulativeReceived || 0) + week.received,
                        cumulativeShipped: (prevData.cumulativeShipped || 0) + week.shipped
                      };
                    })}
                  >
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
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'stores' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-4 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Top 10 Stores by Total Cases Shipped</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data.topStoresByWeek.map(store => ({
                      store: store.store,
                      total: store.total
                    }))}
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
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Cases Shipped by Store by Week</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={data.allStoreData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="week" 
                      type="category" 
                      allowDuplicatedCategory={false}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {data.allStoresByWeek.map((store, index) => (
                      <Line 
                        key={store.store}
                        dataKey="cases"
                        type="monotone"
                        name={store.store}
                        stroke={colors.stores[index % colors.stores.length]}
                        dot={false}
                        connectNulls={true}
                        // Filter data points for this specific store
                        data={data.allStoreData.filter(d => d.store === store.store)}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-gray-200 p-4 text-center text-sm text-gray-600">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default Dashboard;
