#!/bin/bash

echo "🔍 Testing SPA Routing Configuration..."
echo ""

# Check if static.json exists in build
if [ -f "build/static.json" ]; then
  echo "✅ static.json found in build directory"
  cat build/static.json
else
  echo "❌ static.json NOT found in build directory"
  exit 1
fi

echo ""
echo "📦 Starting local server on port 3001..."
echo ""

# Start server in background
npx -y serve -s build -l 3001 > /tmp/serve-test.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "🧪 Testing routes..."
echo ""

# Test root
echo "Testing root route (/)..."
ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$ROOT_STATUS" = "200" ]; then
  echo "✅ Root route works (HTTP $ROOT_STATUS)"
else
  echo "❌ Root route failed (HTTP $ROOT_STATUS)"
fi

# Test public farmer route
echo "Testing /public/add-farmer/watermelon..."
FARMER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/public/add-farmer/watermelon)
if [ "$FARMER_STATUS" = "200" ]; then
  echo "✅ Public farmer route works (HTTP $FARMER_STATUS)"
else
  echo "❌ Public farmer route failed (HTTP $FARMER_STATUS)"
fi

# Test non-existent route (should still return 200 for SPA)
echo "Testing non-existent route (/some-random-route)..."
RANDOM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/some-random-route)
if [ "$RANDOM_STATUS" = "200" ]; then
  echo "✅ Non-existent route returns index.html (HTTP $RANDOM_STATUS)"
else
  echo "❌ Non-existent route failed (HTTP $RANDOM_STATUS)"
fi

echo ""
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "📋 Summary:"
echo "  - static.json: ✅ Present in build"
echo "  - Root route: HTTP $ROOT_STATUS"
echo "  - Public farmer route: HTTP $FARMER_STATUS"
echo "  - SPA fallback: HTTP $RANDOM_STATUS"
echo ""
echo "If all routes return 200, your routing is configured correctly!"
echo "You can now deploy to Render."


