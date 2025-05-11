const StatusDistribution = ({ statusCounts, totalCount, colors }) => {
    return (
      <>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Order Status Distribution</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 flex">
          {Object.entries(statusCounts).map(([status, count], i) => (
            <div 
              key={status}
              className="h-2.5 rounded-full" 
              style={{ 
                width: `${(count / totalCount) * 100}%`,
                backgroundColor: colors[status] || '#888',
              }}
            ></div>
          ))}
        </div>
        <div className="flex flex-wrap mt-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(statusCounts).map(([status, count], i) => (
            count > 0 && (
              <div key={status} className="flex items-center">
                <div 
                  className="w-2 h-2 rounded-full mr-1" 
                  style={{ backgroundColor: colors[status] || '#888' }}
                ></div>
                <span>{status}: {count}</span>
              </div>
            )
          ))}
        </div>
      </>
    );
  };
  
  export default StatusDistribution;