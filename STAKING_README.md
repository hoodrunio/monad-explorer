# 🚀 Monad Staking Interface

Production-ready staking interface for the Monad blockchain explorer, enabling users to stake MON tokens, earn rewards, and participate in network consensus.

## ✨ Features

### 🔗 **Wallet Integration**
- **Multi-wallet support**: MetaMask, WalletConnect, and other EVM wallets
- **Network detection**: Automatic Monad Testnet connection
- **Balance management**: Real-time MON balance tracking

### 🎯 **Staking Operations**
- **Delegate**: Stake MON tokens to validators
- **Undelegate**: Unstake with 1 epoch withdrawal delay (~5.5 hours)
- **Compound**: Convert rewards to additional stake
- **Claim Rewards**: Withdraw accumulated rewards
- **Withdraw**: Complete undelegation after delay period

### 📊 **Dashboard Features**
- **Portfolio Overview**: Total staked, rewards, and available balance
- **Active Delegations**: Manage all validator delegations
- **Pending Withdrawals**: Track unstaking progress
- **Real-time Updates**: Live balance and reward tracking

### 🏆 **Validator Explorer**
- **Comprehensive List**: All active and inactive validators
- **Smart Filtering**: Search by ID, commission rate, stake amount
- **Performance Metrics**: APY estimates, uptime, commission rates
- **Detailed Info**: Validator stake, consensus participation

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: Nuxt 3 + Vue 3 Composition API
- **Web3**: Wagmi + Viem for blockchain interactions
- **State Management**: Pinia stores
- **Styling**: SCSS modules with CSS variables
- **Network**: Monad Testnet (EVM-compatible)

### **Key Components**

```
components/
├── staking/
│   ├─ StakingOverview.vue      # Main staking dashboard
│   ├─ StakingCard.vue          # Individual validator staking card
│   ├─ ValidatorCard.vue        # Validator information display
│   └─ StakingNotifications.vue # Status notifications
├── WalletConnect.vue           # Wallet connection component
└── ...

pages/
├── staking/
│   ├─ index.vue               # Staking overview page
│   ├─ validators.vue          # Validator list page
│   └─ dashboard.vue           # User dashboard page

store/
└── staking.store.js           # Pinia store for staking state

services/
├── api/
│   └── staking.js            # Staking precompile API calls
└── config/
    └── chains.js             # Network and contract configuration
```

## 🔧 Setup & Installation

### **1. Install Dependencies**

```bash
# Install new Web3 dependencies
pnpm install @rainbow-me/rainbowkit@^2.1.0 \
            @tanstack/vue-query@^5.0.0 \
            @wagmi/core@^2.13.0 \
            wagmi@^2.12.0 \
            viem@^2.21.0 \
            ethers@^6.13.0
```

### **2. Environment Configuration**

Add to your `.env` file:

```env
# Optional: WalletConnect Project ID
WALLET_CONNECT_PROJECT_ID=your_project_id_here

# Monad RPC (already configured)
MONAD_RPC_URL=https://rpc-testnet-2.monadinfra.com
```

### **3. Network Configuration**

The interface is pre-configured for Monad Testnet:

```javascript
// config/chains.js
export const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  rpcUrls: {
    default: { http: ['https://rpc-testnet-2.monadinfra.com'] }
  },
  // ... other config
}
```

### **4. Start Development Server**

```bash
pnpm dev
```

Access the staking interface at `http://localhost:9090/staking`

## 📖 Usage Guide

### **For Delegators**

1. **Connect Wallet**
   - Click "Connect Wallet" and select your preferred wallet
   - Ensure you're connected to Monad Testnet
   - Your MON balance will be displayed

2. **Browse Validators**
   - Navigate to `/staking/validators`
   - Filter by active status, commission rate, or search by ID
   - Compare APY estimates and performance metrics

3. **Stake Tokens**
   - Select a validator and click "Stake"
   - Enter the amount of MON to stake
   - Confirm the transaction in your wallet
   - Stake becomes active in the next epoch (~5.5 hours)

4. **Manage Delegations**
   - Visit `/staking/dashboard` to view all delegations
   - Compound rewards to increase your stake
   - Claim rewards to withdraw MON to your wallet
   - Undelegate tokens with 1 epoch withdrawal delay

### **For Validators**

The interface provides read-only validator information. To register as a validator, you'll need to:

1. Meet minimum self-stake requirements
2. Generate unique SECP256K1 and BLS keys
3. Call the `addValidator` function directly on the staking contract

## 🔒 Security Features

### **Smart Contract Integration**
- **Precompile Address**: `0x0000000000000000000000000000000000001000`
- **Read-only View Functions**: Safe data fetching
- **Transaction Safety**: Amount validation and gas estimation
- **Network Verification**: Ensures correct network connection

### **User Safety**
- **Balance Checks**: Prevents over-spending
- **Gas Reserves**: Maintains ETH for transaction fees
- **Input Validation**: Comprehensive form validation
- **Error Handling**: Clear error messages and recovery

### **State Management**
- **Real-time Updates**: Automatic balance and stake refreshing
- **Optimistic Updates**: Immediate UI feedback
- **Error Recovery**: Automatic retry on failed requests
- **Data Persistence**: Important state cached appropriately

## 🌊 Staking Flow

### **Delegation Process**
```
1. Select Validator → 2. Enter Amount → 3. Sign Transaction → 4. Wait for Confirmation
                                                                       ↓
5. Stake Active in Next Epoch ← 4b. If in Boundary Period: +1 Epoch
```

### **Undelegation Process**
```
1. Select Delegation → 2. Enter Amount → 3. Sign Transaction → 4. Tokens Become Inactive
                                                                       ↓
5. Wait 1 Epoch Delay → 6. Withdraw Available → 7. Sign Withdrawal → 8. Receive MON
```

### **Reward Management**
```
Earn Rewards → View in Dashboard → Choose: Compound (Restake) OR Claim (Withdraw)
```

## 📈 Key Metrics

- **Epoch Length**: 50,000 blocks (~5.5 hours)
- **Withdrawal Delay**: 1 epoch minimum
- **Active Validator Set**: Maximum 200 validators
- **Commission Range**: 0% - 100%
- **Minimum Stake**: TBD (defined by network)

## 🐛 Troubleshooting

### **Common Issues**

**"Wrong Network" Error**
- Ensure you're connected to Monad Testnet (Chain ID: 41454)
- Use the "Switch Network" button in the wallet component

**Transaction Failures**
- Check you have sufficient MON balance
- Ensure gas fees are available
- Verify validator is still active

**Slow Loading**
- Monad testnet RPC may be under load
- Try refreshing the page
- Check your internet connection

**Validator Not Found**
- Validator may have been removed from active set
- Check the validator ID is correct
- Some validators may be inactive

### **Error Codes**

- `INSUFFICIENT_BALANCE`: Not enough MON tokens
- `VALIDATOR_INACTIVE`: Selected validator not in active set
- `EPOCH_BOUNDARY`: Action delayed due to epoch timing
- `NETWORK_ERROR`: RPC connection issues

## 🚀 Deployment

### **Production Deployment**

1. **Build the Application**
   ```bash
   pnpm build
   ```

2. **Environment Variables**
   ```env
   NUXT_PUBLIC_APP_ENV=production
   WALLET_CONNECT_PROJECT_ID=your_production_project_id
   ```

3. **Deploy to Your Platform**
   - Vercel, Netlify, or any static hosting
   - Ensure environment variables are set
   - Configure custom domain if needed

### **Mainnet Configuration**

When Monad mainnet launches, update `config/chains.js`:

```javascript
export const monadMainnet = {
  id: [MAINNET_CHAIN_ID],
  name: 'Monad',
  rpcUrls: {
    default: { http: ['[MAINNET_RPC_URL]'] }
  },
  testnet: false,
}
```

## 🤝 Contributing

This staking interface is part of the Monad Explorer project. For contributions:

1. Follow existing code patterns and component structure
2. Test all staking operations on testnet
3. Ensure responsive design works on mobile
4. Add appropriate error handling and validation
5. Update documentation for new features

## 📝 License

MIT License - Same as the main Monad Explorer project.

---

## 🎉 **Staking Interface is Now Live!**

The production-ready staking interface is fully implemented with:

✅ **Complete wallet integration** with multi-wallet support  
✅ **Full staking operations** (delegate, undelegate, compound, claim)  
✅ **Comprehensive validator explorer** with filtering and search  
✅ **User-friendly dashboard** for delegation management  
✅ **Real-time updates** and notifications  
✅ **Mobile-responsive design** for all devices  
✅ **Production-grade error handling** and validation  
✅ **Security best practices** and input validation  

**Ready to earn rewards on Monad! 🚀**
