# MonadDoodle - Collaborative Pixel Canvas

**MonadDoodle** is an open-source Vue.js/Nuxt.js application that enables real-time collaborative pixel art creation on the Monad blockchain testnet. Users can draw together on a shared 32x32 pixel canvas, where every pixel change is recorded as a micro-transaction on the Monad testnet.

## 🛠️ Technology Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Nuxt.js 3** - Full-stack Vue framework with SSR/SSG
- **Pinia** - State management for Vue applications
- **SCSS** - Advanced CSS with variables and mixins
- **TypeScript** - Type-safe JavaScript development

### Blockchain
- **Monad Testnet** - EVM-compatible blockchain for transactions
- **Ethers.js v6** - Ethereum library for blockchain interactions
- **MetaMask** - Web3 wallet integration

### Real-time Collaboration
- **WebSockets** - Real-time communication protocol
- **Multisynq** - Collaborative synchronization platform (simulated)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- MetaMask or compatible Web3 wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hoodrunio/monadoodle.git
   cd monadoodle
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎨 How to Use

### Getting Started
1. **Open MonadDoodle** in your web browser
2. **Connect your wallet** using the "Connect Wallet" button
3. **Select a color** from the color palette
4. **Click on the canvas** to set pixels
5. **Watch the magic** as other users draw in real-time!

### Drawing Tools
- **Brush Tool**: Set pixels with the selected color
- **Eraser Tool**: Remove pixels (set to black)
- **Color Palette**: 12 predefined colors optimized for pixel art

### Canvas Features
- **Grid Overlay**: Visual grid to help with pixel placement
- **Cursor Tracking**: See where other users are drawing
- **Coordinate Display**: Shows current mouse position
- **Real-time Updates**: Instant synchronization across all users

## 🏗️ Project Structure

```
monadoodle/
├── assets/
│   └── styles/           # SCSS stylesheets
├── components/
│   ├── ui/              # Reusable UI components
│   └── modules/         # Feature-specific components
├── layouts/             # Nuxt.js layouts
├── pages/              # Nuxt.js pages/routes
├── stores/             # Pinia state management
├── services/           # Business logic services
├── plugins/            # Nuxt.js plugins
├── public/             # Static assets
├── nuxt.config.ts      # Nuxt.js configuration
└── package.json        # Project dependencies
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
# Multisynq API Key
MULTISYNQ_API_KEY=your_multisynq_api_key

# Monad Testnet RPC URL
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# Contract Address (optional)
PIXEL_CONTRACT_ADDRESS=0x...
```

### Blockchain Configuration
The application is pre-configured for Monad testnet:
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Network ID**: Monad Testnet
- **Gas Price**: 0.0001 MON per pixel

## 📝 Smart Contract

### Simple Pixel Storage Contract
```solidity
pragma solidity ^0.8.0;

contract PixelCanvas {
    mapping(uint8 => mapping(uint8 => bytes3)) public pixels;
    mapping(uint8 => mapping(uint8 => address)) public pixelOwners;
    mapping(uint8 => mapping(uint8 => uint256)) public pixelTimestamps;
    
    uint256 public totalPixelsSet;
    uint256 public constant PIXEL_PRICE = 0.0001 ether;
    
    event PixelSet(uint8 indexed x, uint8 indexed y, bytes3 color, address indexed owner);
    
    function setPixel(uint8 x, uint8 y, bytes3 color) external payable {
        require(msg.value >= PIXEL_PRICE, "Insufficient payment");
        require(x < 32 && y < 32, "Coordinates out of bounds");
        
        pixels[x][y] = color;
        pixelOwners[x][y] = msg.sender;
        pixelTimestamps[x][y] = block.timestamp;
        totalPixelsSet++;
        
        emit PixelSet(x, y, color, msg.sender);
    }
}
```

## 🎮 Plugin Integration

MonadDoodle is designed as both a standalone application and a plugin for existing Vue.js/Nuxt.js projects.

### As a Plugin
```javascript
// Install as npm package (when published)
npm install monadoodle

// Import and use in your Vue app
import { MonadDoodlePlugin } from 'monadoodle'
app.use(MonadDoodlePlugin)
```

### Integration Points
- **Component**: `<MonadoodleCanvas />` 
- **Store Integration**: Compatible with existing Pinia stores
- **Theme System**: Uses CSS variables for easy theme integration
- **Event System**: Emits events for pixel changes and user interactions

## 🌟 Features in Detail

### Real-time Collaboration
- **Multi-user Support**: Unlimited simultaneous users
- **Conflict Resolution**: Handles simultaneous pixel changes gracefully
- **User Presence**: Live cursor tracking and user indicators
- **Event Broadcasting**: Real-time synchronization of all canvas changes

### Blockchain Integration
- **Micro-transactions**: Affordable 0.0001 MON per pixel
- **Permanent Storage**: All pixel changes stored on-chain
- **Transaction Tracking**: Monitor gas usage and transaction history
- **Ownership Records**: Track who set each pixel and when

## 🔍 Development

### Available Scripts
```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint code
pnpm lint

# Deploy to Vercel
pnpm deploy
```

**Built with ❤️ for the Monad ecosystem** 