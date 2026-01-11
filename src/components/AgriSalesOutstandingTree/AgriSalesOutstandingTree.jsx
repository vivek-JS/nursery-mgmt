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

const AgriSalesOutstandingTreeComponent = ({ data, filters = {}, onOrderNodeClick }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1500, height: 600 });
  const [expandedNodes, setExpandedNodes] = useState(new Set(["root"]));
  const [loadingNodes, setLoadingNodes] = useState(new Set());
  const [treeData, setTreeData] = useState(null);
  const [loadedOrders, setLoadedOrders] = useState({}); // Store loaded orders by village path
  const [loadedDistricts, setLoadedDistricts] = useState({}); // Store loaded districts by outstanding node path

  const formatCurrency = (value) => {
    if (value === 0 || isNaN(value)) return "₹0";
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)} K`;
    return `₹${value.toFixed(2)}`;
  };

  // Build tree structure from data
  useEffect(() => {
    if (!data || !data.sales || !data.outstanding) return;

    const { sales, outstanding } = data;
    const salesBySalesmen = sales.bySalesmen || [];
    const outstandingBySalesmen = outstanding.bySalesmen || [];
    const outstandingByDistrict = outstanding.byDistrict || [];
    const outstandingByTaluka = outstanding.byTaluka || [];
    const outstandingByVillage = outstanding.byVillage || [];

    // Build tree: Total → Salesmen → [Collected, Outstanding] → District → Taluka → Village → Orders
    const rootNode = {
      name: "All Outstanding",
      value: outstanding.total?.totalOutstanding || 0,
      totalOrders: outstanding.total?.totalOrders || 0,
      type: "root",
      path: "root",
      children: []
    };

    // Create a map of salesmen from outstanding data
    const salesmanMap = {};
    outstandingBySalesmen.forEach(salesman => {
      const salesmanId = salesman._id?.toString();
      if (salesmanId) {
        salesmanMap[salesmanId] = {
          ...salesman,
          totalOutstanding: salesman.totalOutstanding || 0,
          totalOrders: salesman.totalOrders || 0
        };
      }
    });

    // Match with sales data to get total amounts
    salesBySalesmen.forEach(salesman => {
      const salesmanId = salesman._id?.toString();
      if (salesmanId && salesmanMap[salesmanId]) {
        salesmanMap[salesmanId].totalAmount = salesman.totalAmount || 0;
        salesmanMap[salesmanId].salesmanName = salesman.salesmanName || salesmanMap[salesmanId].salesmanName;
        salesmanMap[salesmanId].salesmanPhone = salesman.salesmanPhone || salesmanMap[salesmanId].salesmanPhone;
      }
    });

    // Build salesman nodes with Collected and Outstanding children
    rootNode.children = Object.values(salesmanMap).map(salesman => {
      const totalAmount = salesman.totalAmount || 0;
      const totalOutstanding = salesman.totalOutstanding || 0;
      const totalCollected = totalAmount - totalOutstanding;

      return {
        name: `Salesman: ${salesman.salesmanName || 'Unknown'}`,
        value: totalOutstanding,
        totalOrders: salesman.totalOrders || 0,
        type: "salesman",
        salesmanId: salesman._id,
        salesmanName: salesman.salesmanName,
        salesmanPhone: salesman.salesmanPhone,
        totalAmount: totalAmount,
        totalCollected: totalCollected,
        totalOutstanding: totalOutstanding,
        path: `root.Salesman: ${salesman.salesmanName || 'Unknown'}`,
        children: [
          {
            name: "Collected",
            value: totalCollected,
            totalOrders: 0, // Will be calculated
            type: "collected",
            salesmanId: salesman._id,
            salesmanName: salesman.salesmanName,
            path: `root.Salesman: ${salesman.salesmanName || 'Unknown'}.Collected`,
            children: null,
            _hasChildren: false
          },
          {
            name: "Outstanding",
            value: totalOutstanding,
            totalOrders: salesman.totalOrders || 0,
            type: "outstanding",
            salesmanId: salesman._id,
            salesmanName: salesman.salesmanName,
            path: `root.Salesman: ${salesman.salesmanName || 'Unknown'}.Outstanding`,
            children: null, // Will be loaded on expand
            _hasChildren: true
          }
        ],
        _hasChildren: true
      };
    });

    setTreeData(rootNode);
  }, [data]);

  // Load districts for an outstanding node by fetching orders and aggregating
  const loadOutstandingDistricts = async (node) => {
    const nodePath = node.path;
    
    if (loadedDistricts[nodePath]) {
      return loadedDistricts[nodePath];
    }

    if (loadingNodes.has(nodePath)) {
      return;
    }

    setLoadingNodes(prev => new Set(prev).add(nodePath));

    try {
      // Fetch orders for this salesman with outstanding balance
      const params = {
        ...filters,
        createdBy: node.salesmanId,
        paymentStatus: 'PENDING', // Only pending payments for outstanding
        limit: 10000,
        page: 1
      };

      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success" && response.data.data?.orders) {
        const orders = response.data.data.orders.filter(order => (order.balanceAmount || 0) > 0);

        // Aggregate by District → Taluka → Village
        const districtMap = {};
        const talukaMap = {};
        const villageMap = {};

        orders.forEach(order => {
          const district = order.customerDistrict || 'Unknown';
          const taluka = order.customerTaluka || 'Unknown';
          const village = order.customerVillage || 'Unknown';
          const balanceAmount = order.balanceAmount || 0;

          // District
          if (!districtMap[district]) {
            districtMap[district] = {
              name: `District: ${district}`,
              value: 0,
              totalOrders: 0,
              type: "district",
              district: district,
              salesmanId: node.salesmanId,
              salesmanName: node.salesmanName,
              path: `${nodePath}.District: ${district}`,
              children: null,
              _hasChildren: true
            };
          }
          districtMap[district].value += balanceAmount;
          districtMap[district].totalOrders += 1;

          // Taluka
          const talukaKey = `${district}.${taluka}`;
          if (!talukaMap[talukaKey]) {
            talukaMap[talukaKey] = {
              name: `Taluka: ${taluka}`,
              value: 0,
              totalOrders: 0,
              type: "taluka",
              taluka: taluka,
              district: district,
              salesmanId: node.salesmanId,
              salesmanName: node.salesmanName,
              path: `${nodePath}.District: ${district}.Taluka: ${taluka}`,
              children: null,
              _hasChildren: true
            };
          }
          talukaMap[talukaKey].value += balanceAmount;
          talukaMap[talukaKey].totalOrders += 1;

          // Village
          const villageKey = `${district}.${taluka}.${village}`;
          if (!villageMap[villageKey]) {
            villageMap[villageKey] = {
              name: `Village: ${village}`,
              value: 0,
              totalOrders: 0,
              type: "village",
              village: village,
              taluka: taluka,
              district: district,
              salesmanId: node.salesmanId,
              salesmanName: node.salesmanName,
              path: `${nodePath}.District: ${district}.Taluka: ${taluka}.Village: ${village}`,
              children: null,
              _hasChildren: true
            };
          }
          villageMap[villageKey].value += balanceAmount;
          villageMap[villageKey].totalOrders += 1;
        });

        // Build hierarchy: District → Taluka → Village
        Object.values(districtMap).forEach(districtNode => {
          const talukas = Object.values(talukaMap).filter(t => t.district === districtNode.district);
          districtNode.children = talukas;
          
          talukas.forEach(talukaNode => {
            const villages = Object.values(villageMap).filter(v => 
              v.district === talukaNode.district && v.taluka === talukaNode.taluka
            );
            talukaNode.children = villages;
          });
        });

        const districtNodes = Object.values(districtMap);
        setLoadedDistricts(prev => ({
          ...prev,
          [nodePath]: districtNodes
        }));

        return districtNodes;
      }
    } catch (error) {
      console.error(`Error loading districts for outstanding node:`, error);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodePath);
        return newSet;
      });
    }

    return [];
  };

  // Load orders for a village node
  const loadVillageOrders = async (node) => {
    const nodePath = node.path;
    
    if (loadedOrders[nodePath]) {
      return loadedOrders[nodePath];
    }

    if (loadingNodes.has(nodePath)) {
      return;
    }

    setLoadingNodes(prev => new Set(prev).add(nodePath));

    try {
      const params = {
        ...filters,
        createdBy: node.salesmanId,
        customerDistrict: node.district,
        customerTaluka: node.taluka,
        customerVillage: node.village,
        paymentStatus: 'PENDING', // Only pending payments for outstanding
        limit: 1000,
        page: 1
      };

      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success" && response.data.data?.orders) {
        const orders = response.data.data.orders;
        const orderNodes = orders
          .filter(order => (order.balanceAmount || 0) > 0) // Only outstanding orders
          .map(order => ({
            name: `Order: ${order.orderNumber || order._id}`,
            value: order.balanceAmount || 0,
            totalOrders: 1,
            type: "order",
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderData: order,
            path: `${nodePath}.Order: ${order.orderNumber || order._id}`,
            children: null,
            _hasChildren: false
          }));

        setLoadedOrders(prev => ({
          ...prev,
          [nodePath]: orderNodes
        }));

        return orderNodes;
      }
    } catch (error) {
      console.error(`Error loading orders for village ${node.village}:`, error);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodePath);
        return newSet;
      });
    }

    return [];
  };

  // Build tree structure with expanded nodes
  const buildTree = (node, path = "", parentValue = null) => {
    if (!node) return null;

    const currentPath = path || node.path;
    const isExpanded = expandedNodes.has(currentPath);
    const hasLoadedChildren = node.children && node.children.length > 0;
    const hasLoadedDistricts = loadedDistricts[currentPath] && loadedDistricts[currentPath].length > 0;
    const hasOrders = loadedOrders[currentPath] && loadedOrders[currentPath].length > 0;

    let children = null;
    if (isExpanded && hasLoadedChildren) {
      children = node.children.map(child => buildTree(child, child.path, node.value));
    } else if (isExpanded && hasLoadedDistricts) {
      children = loadedDistricts[currentPath].map(child => buildTree(child, child.path, node.value));
    } else if (isExpanded && hasOrders) {
      children = loadedOrders[currentPath].map(child => buildTree(child, child.path, node.value));
    } else if (isExpanded && node.type === 'outstanding' && node._hasChildren) {
      // Show loading node for outstanding
      children = [{
        name: "Loading...",
        value: 0,
        type: "loading",
        path: `${currentPath}.loading`,
        children: null,
        _hasChildren: false
      }];
    } else if (isExpanded && node.type === 'village' && node._hasChildren) {
      // Show loading node for village
      children = [{
        name: "Loading...",
        value: 0,
        type: "loading",
        path: `${currentPath}.loading`,
        children: null,
        _hasChildren: false
      }];
    }

    const percentage = parentValue && parentValue > 0 
      ? ((node.value / parentValue) * 100) 
      : 100;

    return {
      ...node,
      path: currentPath,
      percentage: Math.min(percentage, 100),
      children
    };
  };

  const toggleNode = async (nodePath, nodeData) => {
    const isExpanded = expandedNodes.has(nodePath);
    
    if (isExpanded) {
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodePath);
        return newSet;
      });
    } else {
      setExpandedNodes(prev => new Set(prev).add(nodePath));
      
      // If it's an outstanding node, load districts
      if (nodeData.type === 'outstanding' && nodeData._hasChildren) {
        await loadOutstandingDistricts(nodeData);
      }
      // If it's a village node, load orders
      else if (nodeData.type === 'village' && nodeData._hasChildren) {
        await loadVillageOrders(nodeData);
      }
    }
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
          const isExpandable = d.data._hasChildren || (d.data.children && d.data.children.length > 0);
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
          
          if ((d.data._hasChildren || (d.data.children && d.data.children.length > 0)) ||
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
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1);

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
            case "collected": return "#10b981";
            case "outstanding": return "#f59e0b";
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
        .attr("class", "node-label")
        .attr("dx", CONSTANTS.RECT_WIDTH / 2 + 8)
        .attr("dy", 5)
        .attr("font-size", "12px")
        .attr("fill", "#333")
        .text(d => {
          const name = d.data.name || "";
          const value = formatCurrency(d.data.value || 0);
          const orders = d.data.totalOrders || 0;
          return `${name} - ${value}${orders > 0 ? ` (${orders} orders)` : ''}`;
        });
    }
  }, [treeData, expandedNodes, loadedDistricts, loadedOrders, dimensions, onOrderNodeClick]);

  if (!data || !data.sales || !data.outstanding) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto">
      <svg ref={svgRef} className="w-full"></svg>
    </div>
  );
};

export default AgriSalesOutstandingTreeComponent;
