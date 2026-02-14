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
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-replace-with-actual-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
MONGODB_URI=your-mongodb-uri
EOF
    echo "✅ Created .env.local"
    echo "⚠️  Please update .env.local with your actual credentials!"
else
    echo "✅ .env.local already exists"
fi

# Step 3: Generate NextAuth secret if needed
if grep -q "your-secret-here" .env.local 2>/dev/null; then
    echo "🔐 Generating NextAuth secret..."
    SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-secret-here-replace-with-actual-secret")
    if [ "$SECRET" != "your-secret-here-replace-with-actual-secret" ]; then
        # Note: This is a simple replacement, user should manually update
        echo "⚠️  Generated secret: $SECRET"
        echo "⚠️  Please manually update NEXTAUTH_SECRET in .env.local"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env.local with your actual credentials:"
echo "   - NEXTAUTH_SECRET (use: openssl rand -base64 32)"
echo "   - GOOGLE_CLIENT_ID (from Google Cloud Console)"
echo "   - GOOGLE_CLIENT_SECRET (from Google Cloud Console)"
echo "   - MONGODB_URI (your MongoDB connection string)"
echo ""
echo "2. Run the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"

