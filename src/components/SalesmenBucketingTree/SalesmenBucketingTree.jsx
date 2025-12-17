import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { API } from '../../network/config/endpoints';
import NetworkManager from '../../network/core/networkManager';

const CONSTANTS = {
  NODE_SPACING: 85,
  TOP_BOTTOM_PADDING: 80,
  RECT_WIDTH: 120,
  RECT_HEIGHT: 20,
  MIN_HEIGHT: 500,
  TRANSITION_DURATION: 800,
  STAGGER_DELAY: 100
};

const SalesmenBucketingTreeComponent = ({ filters = {}, onOrderNodeClick }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1500, height: 600 });
  const [expandedNodes, setExpandedNodes] = useState(new Set(["root"]));
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingNodes, setLoadingNodes] = useState(new Set());
  const [treeData, setTreeData] = useState(null);
  const [loadedData, setLoadedData] = useState({});

  const formatCurrency = (value) => {
    if (value === 0 || isNaN(value)) return "₹0";
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)} K`;
    return `₹${value.toFixed(2)}`;
  };

  // Initial load: Get all salesmen (level 1)
  useEffect(() => {
    loadSalesmen();
  }, [filters]);

  const loadSalesmen = async () => {
    try {
      const params = {
        level: '1',
        ...filters
      };
      const instance = NetworkManager(API.ORDER.GET_SALESMEN_BUCKETING);
      const response = await instance.request({}, params);

      if (response?.data?.success && response.data.data) {
        const salesmen = response.data.data;
        const totalAmount = salesmen.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const totalOrders = salesmen.reduce((sum, s) => sum + (s.totalOrders || 0), 0);
        const totalPlants = salesmen.reduce((sum, s) => sum + (s.totalPlants || 0), 0);

        const rootNode = {
          name: "All Salesmen",
          value: totalAmount,
          totalOrders: totalOrders,
          totalPlants: totalPlants,
          type: "root",
          path: "root",
          children: salesmen.map(salesman => ({
            name: `Salesman: ${salesman.salesPersonName || 'Unknown'}`,
            value: salesman.totalAmount || 0,
            totalOrders: salesman.totalOrders || 0,
            totalPlants: salesman.totalPlants || 0,
            type: "salesman",
            salesPersonId: salesman.salesPersonId,
            salesPersonName: salesman.salesPersonName,
            salesPersonPhone: salesman.salesPersonPhone,
            path: `root.Salesman: ${salesman.salesPersonName || 'Unknown'}`,
            children: null,
            _hasChildren: true
          }))
        };

        setTreeData(rootNode);
      }
    } catch (error) {
      console.error('Error loading salesmen:', error);
    }
  };

  // Load children for a node based on its type
  const loadNodeChildren = async (node) => {
    const nodePath = node.path;
    
    if (loadedData[nodePath]) {
      return loadedData[nodePath];
    }

    if (loadingNodes.has(nodePath)) {
      return;
    }

    setLoadingNodes(prev => new Set(prev).add(nodePath));

    try {
      let params = { ...filters };
      let level = 1;
      let children = [];

      if (node.type === 'salesman') {
        // Load districts (level 2)
        level = 2;
        params.salesPersonId = node.salesPersonId;
      } else if (node.type === 'district') {
        // Load talukas (level 3)
        level = 3;
        params.salesPersonId = node.salesPersonId;
        params.district = node.district;
      } else if (node.type === 'taluka') {
        // Load villages (level 4)
        level = 4;
        params.salesPersonId = node.salesPersonId;
        params.district = node.district;
        params.taluka = node.taluka;
      } else if (node.type === 'village') {
        // Load orders (level 5)
        level = 5;
        params.salesPersonId = node.salesPersonId;
        params.district = node.district;
        params.taluka = node.taluka;
        params.village = node.village;
      }

      params.level = level.toString();

      const instance = NetworkManager(API.ORDER.GET_SALESMEN_BUCKETING);
      const response = await instance.request({}, params);

      if (response?.data?.success && response.data.data) {
        const data = response.data.data;

        if (level === 2) {
          // Districts
          children = data.map(district => ({
            name: `District: ${district.districtName || district.district}`,
            value: district.totalAmount || 0,
            totalOrders: district.totalOrders || 0,
            totalPlants: district.totalPlants || 0,
            type: "district",
            district: district.district,
            districtName: district.districtName,
            salesPersonId: node.salesPersonId,
            salesPersonName: node.salesPersonName,
            path: `${nodePath}.District: ${district.districtName || district.district}`,
            children: null,
            _hasChildren: true
          }));
        } else if (level === 3) {
          // Talukas
          children = data.map(taluka => ({
            name: `Taluka: ${taluka.talukaName || taluka.taluka}`,
            value: taluka.totalAmount || 0,
            totalOrders: taluka.totalOrders || 0,
            totalPlants: taluka.totalPlants || 0,
            type: "taluka",
            taluka: taluka.taluka,
            talukaName: taluka.talukaName,
            salesPersonId: node.salesPersonId,
            salesPersonName: node.salesPersonName,
            district: node.district,
            districtName: node.districtName,
            path: `${nodePath}.Taluka: ${taluka.talukaName || taluka.taluka}`,
            children: null,
            _hasChildren: true
          }));
        } else if (level === 4) {
          // Villages
          children = data.map(village => ({
            name: `Village: ${village.village}`,
            value: village.totalAmount || 0,
            totalOrders: village.totalOrders || 0,
            totalPlants: village.totalPlants || 0,
            type: "village",
            village: village.village,
            salesPersonId: node.salesPersonId,
            salesPersonName: node.salesPersonName,
            district: node.district,
            districtName: node.districtName,
            taluka: node.taluka,
            talukaName: node.talukaName,
            path: `${nodePath}.Village: ${village.village}`,
            children: null,
            _hasChildren: true
          }));
        } else if (level === 5) {
          // Orders
          children = data.map(order => ({
            name: `Order #${order.orderId}`,
            value: order.totalAmount || 0,
            totalOrders: 1,
            totalPlants: order.numberOfPlants || 0,
            type: "order",
            orderId: order.orderId,
            orderData: order,
            path: `${nodePath}.Order #${order.orderId}`,
            children: null,
            _hasChildren: false
          }));
        }

        setLoadedData(prev => ({
          ...prev,
          [nodePath]: children
        }));

        return children;
      }
    } catch (error) {
      console.error(`Error loading children for ${node.type}:`, error);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodePath);
        return newSet;
      });
    }

    return [];
  };

  // Build tree structure with loaded data
  const buildTree = (node, path = "", parentValue = null) => {
    if (!node) return null;

    const currentPath = path ? `${path}.${node.name}` : node.name;
    const processedNode = { ...node, path: currentPath };

    processedNode.percentage = parentValue && parentValue > 0 ? (node.value / parentValue) * 100 : 100;

    const matchesSearch = searchTerm === '' || 
      node.name.toLowerCase().includes(searchTerm.toLowerCase());
    processedNode.highlighted = matchesSearch && searchTerm !== '';

    if (expandedNodes.has(currentPath)) {
      if (node._hasChildren && !node.children && loadedData[currentPath]) {
        processedNode.children = loadedData[currentPath].map(child => 
          buildTree(child, currentPath, node.value)
        );
      } else if (node.children) {
        processedNode.children = node.children.map(child =>
          buildTree(child, currentPath, node.value)
        );
      } else if (node._hasChildren && loadingNodes.has(currentPath)) {
        processedNode.children = [{
          name: "Loading...",
          type: "loading",
          path: `${currentPath}.loading`,
          children: null,
          value: 0
        }];
      }
    } else {
      if (node.children) {
        processedNode._children = node.children;
        processedNode.children = null;
      }
    }

    return processedNode;
  };

  const toggleNode = async (nodePath, node) => {
    const isExpanded = expandedNodes.has(nodePath);

    if (!isExpanded && node._hasChildren && !loadedData[nodePath]) {
      await loadNodeChildren(node);
    }

    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodePath)) {
        newExpanded.delete(nodePath);
        [...newExpanded].forEach(path => {
          if (path.startsWith(nodePath + '.')) {
            newExpanded.delete(path);
          }
        });
      } else {
        newExpanded.add(nodePath);
      }
      return newExpanded;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(["root"]));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(["root"]));
  };

  useEffect(() => {
    if (!treeData) return;

    const processedData = buildTree(treeData);
    if (!processedData) return;

    if (svgRef.current) {
      let svg = d3.select(svgRef.current);
      let g = svg.select("g.main-group");
      
      if (g.empty()) {
        svg.selectAll("*").remove();
        svg = svg
          .attr("width", "100%")
          .attr("preserveAspectRatio", "xMidYMid meet");
        
        g = svg.append("g")
          .attr("class", "main-group")
          .attr("transform", `translate(150,40)`);
      }

      const root = d3.hierarchy(processedData);
      const visibleNodeCount = root.descendants().length;
      const dynamicHeight = Math.max(
        CONSTANTS.MIN_HEIGHT, 
        visibleNodeCount * CONSTANTS.NODE_SPACING + CONSTANTS.TOP_BOTTOM_PADDING
      );

      svg
        .attr("height", dynamicHeight)
        .attr("viewBox", `0 0 ${dimensions.width} ${dynamicHeight}`);

      const treeWidth = dimensions.width - 300;
      const treeLayout = d3.tree()
        .size([dynamicHeight - CONSTANTS.TOP_BOTTOM_PADDING, treeWidth])
        .separation((a, b) => (a.parent === b.parent ? 2 : 3));

      treeLayout(root);

      const linkGenerator = d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x);

      const links = g.selectAll(".link")
        .data(root.links(), d => `${d.source.data.path}-${d.target.data.path}`);

      links.exit()
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("stroke-opacity", 0)
        .remove();

      links.enter()
        .append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#aaa")
        .attr("stroke-opacity", 0)
        .attr("stroke-width", 1.5)
        .attr("d", linkGenerator)
        .transition()
        .duration(CONSTANTS.TRANSITION_DURATION)
        .delay((d, i) => i * 50)
        .ease(d3.easeCubicOut)
        .attr("stroke-opacity", 0.6);

      links
        .transition()
        .duration(CONSTANTS.TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr("d", linkGenerator);

      const nodes = g.selectAll(".node")
        .data(root.descendants(), d => d.data.path);

      nodes.exit()
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("transform", d => `translate(${d.y},${d.x}) scale(0)`)
        .style("opacity", 0)
        .remove();

      const nodeEnter = nodes.enter()
        .append("g")
        .attr("class", d => `node ${d.data.type || ""} ${d.children ? "node--internal" : "node--leaf"}`)
        .attr("transform", d => `translate(${d.y},${d.x}) scale(0)`)
        .style("opacity", 0)
        .style("cursor", d => {
          if (d.data.type === 'loading') return "wait";
          const isExpandable = d.data._hasChildren || (d.data._children && d.data._children.length > 0);
          const isCollapsible = d.data.children && d.data.children.length > 0;
          const isOrder = d.data.type === 'order';
          return (isExpandable || isCollapsible || isOrder) ? "pointer" : "default";
        })
        .on("click", async (event, d) => {
          if (d.data.type === 'order' && onOrderNodeClick && d.data.orderData) {
            onOrderNodeClick(d.data.orderData);
            return;
          }
          
          if (d.data.type === 'loading') {
            return;
          }
          
          if ((d.data._hasChildren || (d.data._children && d.data._children.length > 0)) ||
            (d.data.children && d.data.children.length > 0)) {
            await toggleNode(d.data.path, d.data);
            event.stopPropagation();
          }
        });

      nodeEnter
        .transition()
        .duration(CONSTANTS.TRANSITION_DURATION)
        .delay((d, i) => i * CONSTANTS.STAGGER_DELAY)
        .ease(d3.easeElasticOut)
        .attr("transform", d => `translate(${d.y},${d.x}) scale(1)`)
        .style("opacity", 1);

      nodes
        .transition()
        .duration(CONSTANTS.TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.y},${d.x})`);

      nodeEnter.append("rect")
        .attr("width", CONSTANTS.RECT_WIDTH)
        .attr("height", CONSTANTS.RECT_HEIGHT)
        .attr("x", -CONSTANTS.RECT_WIDTH / 2)
        .attr("y", -CONSTANTS.RECT_HEIGHT / 2)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", d => d.data.type === 'loading' ? "#f3f4f6" : "#e5e7eb")
        .attr("stroke", d => d.data.highlighted ? "#f59e0b" : "#ccc")
        .attr("stroke-width", d => d.data.highlighted ? 3 : 1);

      nodeEnter.append("rect")
        .attr("width", 0)
        .attr("height", CONSTANTS.RECT_HEIGHT)
        .attr("x", -CONSTANTS.RECT_WIDTH / 2)
        .attr("y", -CONSTANTS.RECT_HEIGHT / 2)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", d => {
          if (d.data.type === 'loading') return "#d1d5db";
          switch (d.data.type) {
            case "root": return "#1f2937";
            case "salesman": return "#3b82f6";
            case "district": return "#10b981";
            case "taluka": return "#f59e0b";
            case "village": return "#8b5cf6";
            case "order": return "#ef4444";
            default: return "#3498db";
          }
        })
        .attr("opacity", d => {
          if (d.data.type === 'loading') return 0.5;
          if (d.depth === 0) return 1;
          if (d.depth === 1) return 0.9;
          return 0.7 - (d.depth * 0.05);
        })
        .transition()
        .delay((d, i) => i * CONSTANTS.STAGGER_DELAY + 200)
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("width", d => {
          if (d.data.type === 'loading') return CONSTANTS.RECT_WIDTH;
          const percentage = d.data.percentage !== undefined ? d.data.percentage : 100;
          return (CONSTANTS.RECT_WIDTH * Math.min(percentage, 100)) / 100;
        });

      nodeEnter.append("text")
        .attr("dy", -CONSTANTS.RECT_HEIGHT / 2 - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("opacity", 0)
        .text(d => {
          const name = d.data.name || "Unnamed";
          return name.length > 25 ? name.substring(0, 22) + '...' : name;
        })
        .transition()
        .delay((d, i) => i * CONSTANTS.STAGGER_DELAY + 400)
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

      nodeEnter.append("text")
        .attr("dy", CONSTANTS.RECT_HEIGHT / 2 + 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#000000")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("opacity", 0)
        .text(d => {
          if (d.data.type === 'loading') return "Loading...";
          return formatCurrency(d.data.value || 0);
        })
        .transition()
        .delay((d, i) => i * CONSTANTS.STAGGER_DELAY + 450)
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

      nodeEnter.append("text")
        .attr("dy", CONSTANTS.RECT_HEIGHT / 2 - 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff")
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .attr("opacity", 0)
        .text(d => {
          if (d.data.type === 'loading') return '';
          const percentage = d.data.percentage;
          return percentage ? `${percentage.toFixed(1)}%` : '';
        })
        .transition()
        .delay((d, i) => i * CONSTANTS.STAGGER_DELAY + 500)
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

      nodeEnter.append("title")
        .text(d => {
          if (d.data.type === 'loading') return "Loading children...";
          const fullValue = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
          }).format(d.data.value || 0);
          
          let tooltipText = `${d.data.name}\nValue: ${fullValue}\n`;
          tooltipText += `Orders: ${d.data.totalOrders || 0}\n`;
          tooltipText += `Plants: ${d.data.totalPlants || 0}\n`;
          tooltipText += `Percentage: ${d.data.percentage ? d.data.percentage.toFixed(1) + '%' : 'N/A'}`;
          
          if (d.data._hasChildren && !d.data.children) {
            tooltipText += `\nClick to load children`;
          } else if (d.data.children && d.data.children.length > 0) {
            tooltipText += `\nClick to collapse (${d.data.children.length} children)`;
          } else if (d.data.type === 'order') {
            tooltipText += `\nClick to view order details`;
          }

          return tooltipText;
        });
    }
  }, [treeData, expandedNodes, dimensions, searchTerm, loadedData, loadingNodes, onOrderNodeClick]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setDimensions(prev => ({
          ...prev,
          width: Math.min(1500, containerWidth)
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!treeData) {
    return (
      <div className="flex justify-center items-center h-40 text-gray-500">
        Loading salesmen...
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4 justify-center items-center flex-wrap">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={expandAll}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
        >
          Collapse All
        </button>
      </div>
      
      <div ref={containerRef} className="flex justify-center w-full overflow-auto border border-gray-200 rounded-lg">
        <svg ref={svgRef} className="bg-white" />
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          <b>Controls:</b> Click nodes to expand/load children • Search to highlight • Data loads on demand
        </p>
        <div className="flex gap-4 justify-center mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-800 rounded"></span> Root
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded"></span> Salesman
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded"></span> District
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-500 rounded"></span> Taluka
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-500 rounded"></span> Village
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded"></span> Order
          </span>
        </div>
      </div>
    </div>
  );
};

export default SalesmenBucketingTreeComponent;


