import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import OverviewTab from './components/tabs/OverviewTab';
import PlantsTab from './components/tabs/PlantsTab';
import SalesTab from './components/tabs/SalesTab';
import SlotsTab from './components/tabs/SlotsTab';
import FinanceTab from './components/tabs/FinanceTab';
import LoadingScreen from './components/common/LoadingScreen';
import { generateMockData } from './services/mockDataService';

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        // const response = await fetch(`/api/dashboard/insights?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        // const data = await response.json();
        
        // Mock data for demonstration
        setTimeout(() => {
          const mockData = generateMockData();
          setDashboardData(mockData);
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Handle date range change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle apply filter button
  const handleApplyFilter = () => {
    // This will trigger the useEffect to reload data
    // No additional code needed here as the useEffect depends on dateRange
  };

  // Render loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!dashboardData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        dateRange={dateRange}
        handleDateChange={handleDateChange}
        handleApplyFilter={handleApplyFilter}
      />
      
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <main className="py-6">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {activeTab === 'overview' && <OverviewTab data={dashboardData.data} />}
          {activeTab === 'plants' && <PlantsTab data={dashboardData.data} />}
          {activeTab === 'sales' && <SalesTab data={dashboardData.data} />}
          {activeTab === 'slots' && <SlotsTab data={dashboardData.data} />}
          {activeTab === 'finance' && <FinanceTab data={dashboardData.data} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;