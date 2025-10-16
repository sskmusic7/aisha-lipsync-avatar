#!/bin/bash

# A.Isha Avatar Deployment Script
# This will deploy your app to Netlify

echo "🚀 A.Isha Lipsync Avatar - Netlify Deployment"
echo "=============================================="
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Check if build exists
if [ ! -d "dist" ]; then
    echo "📦 Building production version..."
    npm run build
else
    echo "✅ Build folder exists"
fi

echo ""
echo "🌐 Deploying to Netlify..."
echo ""
echo "You'll be prompted to:"
echo "1. Choose: '+  Create & configure a new project'"
echo "2. Team: Select 'Callaloo'"
echo "3. Site name: Enter 'aisha-lipsync-avatar' (or your preferred name)"
echo ""
echo "Press Enter to continue..."

# Run Netlify deploy
npx netlify-cli deploy --prod --dir=dist

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎉 Your A.Isha avatar is now LIVE!"
echo ""


