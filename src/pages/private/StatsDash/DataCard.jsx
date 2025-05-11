import React from "react";
const DataCard = ({ 
    title, 
    icon = <Plant className="w-5 h-5 mr-2 text-green-500" />,
    data = [],
    footerComponent 
  }) => {
    return (
      <div className="flex flex-col">
        <div className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          {icon}
          {title}
        </div>
        <div className="flex flex-col space-y-2 text-sm">
          {data.map((item, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-500">{item.label}:</span>
              <span className={`font-medium ${item.color || ''}`}>{item.value}</span>
            </div>
          ))}
        </div>
        {footerComponent && (
          <div className="mt-4">
            {footerComponent}
          </div>
        )}
      </div>
    );
  };
  
  export default DataCard;
  