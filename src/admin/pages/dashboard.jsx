import React, { useState, useEffect } from 'react';
import { IndianRupee, ShoppingCart, TrendingUp, Users, Calendar, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import axios from 'axios';
import { BASE_URL } from '../../util';

const COLORS = ['#38bdf8', '#4ade80', '#a78bfa', '#fb923c'];

const Dashboard = () => {
  // Add animation keyframes at the top of the component
  const keyframes = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `;

  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [orderStats, setOrderStats] = useState({
    totalOrders: '...',
    revenue: '...',
    customers: '...',
    growthRate: '...'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch users for customer count
        const usersResponse = await axios.get(`${BASE_URL}/api/auth/getuser`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        // Fetch orders for delivered count
        const ordersResponse = await axios.get(`${BASE_URL}/api/orders/getall`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        let customerCount = 0;
        let metrics = {
          revenueGrowth: 0,
          orderGrowth: 0,
          currentPeriodMetrics: {
            revenue: 0,
            orders: 0
          }
        };

        if (usersResponse.data && Array.isArray(usersResponse.data)) {
          customerCount = usersResponse.data.filter(user =>
            user.roleid === 2 && user.isactive
          ).length;
        }        let deliveredOrders = [];
        if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
          const allOrders = ordersResponse.data;
          deliveredOrders = allOrders.filter(
            order => order.status && order.status.toLowerCase() === 'delivered'
          );
          
          console.log('All Orders:', allOrders.length);
          console.log('Delivered Orders:', deliveredOrders.length);
          
          // Calculate monthly revenue
          const monthlyData = calculateMonthlyRevenue(allOrders);
          console.log('Setting Monthly Revenue:', monthlyData);
          setMonthlyRevenue(monthlyData);

          // Calculate metrics including growth rates
          metrics = calculatePeriodMetrics(ordersResponse.data);

          console.log("Growth Metrics:", {
            revenueGrowth: metrics.revenueGrowth.toFixed(1) + '%',
            orderGrowth: metrics.orderGrowth.toFixed(1) + '%',
            currentRevenue: formatCurrency(metrics.currentPeriodMetrics.revenue)
          });
        }

        // Update stats with real data and growth rates
        setOrderStats({
          totalOrders: deliveredOrders.length.toString(),
          revenue: formatCurrency(metrics.currentPeriodMetrics.revenue),
          customers: customerCount.toString(),
          growthRate: `${metrics.revenueGrowth >= 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}%`
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const stats = [
    { name: 'Total Revenue', value: orderStats.revenue, icon: IndianRupee, gradient: 'from-blue-500 to-indigo-600', lightGradient: 'from-blue-50 to-indigo-50' },
    { name: 'Total Delivered', value: orderStats.totalOrders, icon: ShoppingCart, gradient: 'from-green-500 to-emerald-600', lightGradient: 'from-green-50 to-emerald-50' },
    { name: 'Total Customers', value: orderStats.customers, icon: Users, gradient: 'from-purple-500 to-indigo-600', lightGradient: 'from-purple-50 to-indigo-50' },
    { name: 'Growth Rate', value: orderStats.growthRate, icon: TrendingUp, gradient: 'from-amber-500 to-orange-600', lightGradient: 'from-amber-50 to-orange-50' }
  ];

  useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/api/orders/getall`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.data && Array.isArray(response.data)) {
          const formattedPendingOrders = response.data
            .filter(order => order.status && order.status.toLowerCase() === 'pending')
            .map(order => ({
              id: order.id,
              product: order.orderItems?.[0]?.product?.productname || 'Unknown Product',
              customer: order.fullname || 'Unknown Customer',
              amount: order.orderItems?.reduce((total, item) => {
                const price = parseFloat(item.priceatpurchase) || 0;
                const quantity = parseInt(item.quantity, 10) || 0;
                return total + (price * quantity);
              }, 0).toFixed(2) || '0',
              status: 'Pending',
              date: new Date(order.createdAt).toISOString().split('T')[0]
            }));

          setPendingOrders(formattedPendingOrders);
        } else {
          console.error("Invalid data format from API");
          setPendingOrders([]);
        }
      } catch (error) {
        console.error("Error fetching pending orders:", error);
        setPendingOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingOrders();
  }, []);

  const prepareChartData = (stats) => {
    return [
      { name: 'Revenue', value: parseFloat(stats.revenue.replace(/[^0-9.-]+/g, '')), color: COLORS[0] },
      { name: 'Delivered', value: parseInt(stats.totalOrders), color: COLORS[1] },
      { name: 'Customers', value: parseInt(stats.customers), color: COLORS[2] },
      { name: 'Growth', value: parseFloat(stats.growthRate), color: COLORS[3] }
    ];
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 rounded-lg shadow-md border border-gray-100">
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.name === 'Revenue' ? formatCurrency(data.value) :
             data.name === 'Growth' ? `${data.value.toFixed(1)}%` :
             data.value}
          </p>
        </div>
      );
    }
    return null;
  };

  const calculateRevenue = (orders) => {
    let totalRevenue = 0;

    orders.forEach((order) => {
      if (order.status && order.status.toLowerCase() === 'delivered') {
        if (order.orderItems && Array.isArray(order.orderItems)) {
          order.orderItems.forEach((item) => {
            totalRevenue += parseFloat(item.priceatpurchase || 0) * (parseInt(item.quantity, 10) || 0);
          });
        }
      }
    });

    return totalRevenue;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateGrowthRate = (currentValue, previousValue) => {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const calculatePeriodMetrics = (orders) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

    // Current period (last 30 days)
    const currentPeriodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= thirtyDaysAgo && order.status && order.status.toLowerCase() === 'delivered';
    });

    // Previous period (30-60 days ago)
    const previousPeriodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo &&
        order.status && order.status.toLowerCase() === 'delivered';
    });

    const currentRevenue = calculateRevenue(currentPeriodOrders);
    const previousRevenue = calculateRevenue(previousPeriodOrders);
    const currentOrderCount = currentPeriodOrders.length;
    const previousOrderCount = previousPeriodOrders.length;

    return {
      revenueGrowth: calculateGrowthRate(currentRevenue, previousRevenue),
      orderGrowth: calculateGrowthRate(currentOrderCount, previousOrderCount),
      currentPeriodMetrics: {
        revenue: currentRevenue,
        orders: currentOrderCount
      }
    };
  };

  const calculateMonthlyRevenue = (orders) => {
    const monthlyData = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = 0;
    }

    // Calculate revenue for each month
    orders.forEach(order => {
      if (order.status && order.status.toLowerCase() === 'delivered' && order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        
        if (orderDate >= sixMonthsAgo) {
          const monthKey = orderDate.toLocaleString('default', { month: 'short', year: '2-digit' });
          if (monthlyData.hasOwnProperty(monthKey) && order.orderItems) {
            order.orderItems.forEach(item => {
              const price = parseFloat(item.priceatpurchase || 0);
              const quantity = parseInt(item.quantity || 0, 10);
              monthlyData[monthKey] += price * quantity;
            });
          }
        }
      }
    });

    // Convert to array for chart
    const result = Object.entries(monthlyData).map(([month, revenue]) => ({
      name: month,
      revenue: Math.round(revenue),
      formattedRevenue: formatCurrency(revenue)
    }));

    console.log('Monthly Revenue Data:', result);
    return result;
  };

  useEffect(() => {
    // Insert animation styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = keyframes;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm min-h-screen border border-gray-100 mt-12 sm:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard Overview</span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">Admin</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Monitor your store's performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {stats.map((stat, index) => (
          <div 
            key={stat.name} 
            className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
            style={{
              animation: `fadeInUp 0.5s ease-out forwards`,
              animationDelay: `${index * 0.1}s`,
              opacity: 0
            }}
          >
            <div className={`bg-gradient-to-r ${stat.lightGradient} px-3 sm:px-4 py-2 border-b border-gray-100`}>
              <div className="flex justify-between items-center">
                <h3 className="text-sm sm:text-base font-medium text-gray-700">{stat.name}</h3>
                <div 
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r ${stat.gradient} flex items-center justify-center text-white shadow-sm transform transition-transform duration-300 hover:scale-110`}
                >
                  <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-xl sm:text-2xl font-bold animate-count">{stat.value}</p>
              <div className="flex items-center mt-2 text-xs sm:text-sm text-green-600">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 animate-bounce" />
                <span>{stat.change} from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-black px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h5 className="text-base sm:text-lg font-semibold text-gray-700 flex items-center">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
              Recent Orders
            </h5>
          </div>

          <div 
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100" 
            style={{ 
              maxHeight: "200px", // Height for approximately 3 rows
              overflowY: "auto",
              position: "relative"
            }}
          >
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs sm:text-sm text-gray-700 bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-50">Order ID</th>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-50">Product</th>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-50">Customer</th>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-50">Amount</th>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-50">Status</th>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-50">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="border-b-0 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-4 py-2 sm:px-6 sm:py-3 font-medium text-gray-900">#{order.id}</td>
                    <td className="px-4 py-2 sm:px-6 sm:py-3">{order.product}</td>
                    <td className="px-4 py-2 sm:px-6 sm:py-3">{order.customer}</td>
                    <td className="px-4 py-2 sm:px-6 sm:py-3">{order.amount}</td>
                    <td className="px-4 py-2 sm:px-6 sm:py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-3">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 text-black px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h5 className="text-base sm:text-lg font-semibold text-gray-700 flex items-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500" />
              Growth Overview
            </h5>
          </div>

          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={prepareChartData(orderStats)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={300}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {prepareChartData(orderStats).map((entry, index) => (
                    <Cell 
                      key={index} 
                      fill={entry.color}
                      className="transition-all duration-300 hover:opacity-80" 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />}
                  animationDuration={200}
                />
                <Legend 
                  verticalAlign="middle" 
                  align="right"
                  layout="vertical"
                  formatter={(value, entry) => (
                    <span className="text-sm text-gray-600 transition-all duration-300 hover:text-gray-900">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* <div className="grid grid-cols-2 gap-4 mt-4">
              {prepareChartData(orderStats).map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-700 ml-2">{item.name}</span>
                </div>
              ))}
            </div> */}
          </div>
        </div>
      </div>      {/* Monthly Revenue Chart */}
      <div className="mt-6">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-black px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h5 className="text-base sm:text-lg font-semibold text-gray-700 flex items-center">
              <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
              Monthly Revenue Trends
            </h5>
          </div>

          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart 
                data={monthlyRevenue} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value/1000)}k`}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100">
                          <p className="text-sm font-semibold text-gray-800">{label}</p>
                          <p className="text-sm font-medium text-blue-600">
                            {formatCurrency(payload[0].value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Monthly Breakdown */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {monthlyRevenue.map((data, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">{data.name}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {data.formattedRevenue}
                  </p>
                  {index < monthlyRevenue.length - 1 && (
                    <p className="text-xs mt-1">
                      {((data.revenue - monthlyRevenue[index + 1].revenue) / monthlyRevenue[index + 1].revenue * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
