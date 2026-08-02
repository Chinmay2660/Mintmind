#!/bin/bash

# Setup script for Mintmind
echo "🚀 Setting up Mintmind..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
GOOGLE_CLIENT_ID=your-client-id
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-secret-here-replace-with-actual-secret
EOF
    echo "✅ Created .env.local"
    echo "⚠️  Please update .env.local with your actual credentials!"
else
    echo "✅ .env.local already exists"
fi

# Step 3: Generate JWT secret if needed
if grep -q "your-secret-here" .env.local 2>/dev/null; then
    echo "🔐 Generating JWT secret..."
    SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-secret-here-replace-with-actual-secret")
    if [ "$SECRET" != "your-secret-here-replace-with-actual-secret" ]; then
        echo "⚠️  Generated secret: $SECRET"
        echo "⚠️  Please manually update JWT_SECRET in .env.local"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env.local with your actual credentials:"
echo "   - GOOGLE_CLIENT_ID (from Google Cloud Console)"
echo "   - MONGODB_URI (your MongoDB connection string)"
echo "   - JWT_SECRET (use: openssl rand -base64 32; optional in dev)"
echo ""
echo "2. Run the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
