// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PixelCanvas
 * @dev A smart contract for collaborative pixel art on a 32x32 canvas
 * @notice Each pixel costs 0.0001 MON to set, stored permanently on-chain
 */
contract PixelCanvas {
    // Canvas dimensions
    uint8 public constant CANVAS_SIZE = 32;
    
    // Pixel price in wei (0.0001 MON)
    uint256 public constant PIXEL_PRICE = 0.0001 ether;
    
    // Owner of the contract
    address public owner;
    
    // Canvas state
    mapping(uint8 => mapping(uint8 => bytes3)) public pixels;
    mapping(uint8 => mapping(uint8 => address)) public pixelOwners;
    mapping(uint8 => mapping(uint8 => uint256)) public pixelTimestamps;
    
    // Statistics
    uint256 public totalPixelsSet;
    uint256 public totalRevenue;
    mapping(address => uint256) public userPixelCounts;
    
    // Events
    event PixelSet(
        uint8 indexed x, 
        uint8 indexed y, 
        bytes3 color, 
        address indexed owner, 
        uint256 timestamp,
        uint256 pixelId
    );
    
    event CanvasCleared(address indexed clearedBy, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier validCoordinates(uint8 x, uint8 y) {
        require(x < CANVAS_SIZE && y < CANVAS_SIZE, "Coordinates out of bounds");
        _;
    }
    
    modifier sufficientPayment() {
        require(msg.value >= PIXEL_PRICE, "Insufficient payment for pixel");
        _;
    }
    
    /**
     * @dev Constructor sets the deployer as the owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @notice Set a pixel on the canvas
     * @param x X coordinate (0-31)
     * @param y Y coordinate (0-31)
     * @param color Color as bytes3 (RGB hex format)
     */
    function setPixel(uint8 x, uint8 y, bytes3 color) 
        external 
        payable 
        validCoordinates(x, y)
        sufficientPayment 
    {
        // Update pixel data
        pixels[x][y] = color;
        pixelOwners[x][y] = msg.sender;
        pixelTimestamps[x][y] = block.timestamp;
        
        // Update statistics
        if (userPixelCounts[msg.sender] == 0) {
            // First pixel for this user
            userPixelCounts[msg.sender] = 1;
        } else {
            userPixelCounts[msg.sender]++;
        }
        
        totalPixelsSet++;
        totalRevenue += msg.value;
        
        // Generate unique pixel ID
        uint256 pixelId = (uint256(x) << 8) | uint256(y);
        
        // Emit event
        emit PixelSet(x, y, color, msg.sender, block.timestamp, pixelId);
        
        // Refund excess payment
        if (msg.value > PIXEL_PRICE) {
            payable(msg.sender).transfer(msg.value - PIXEL_PRICE);
        }
    }
    
    /**
     * @notice Set multiple pixels in a single transaction
     * @param coordinates Array of x,y coordinates as uint16 (x in upper 8 bits, y in lower 8 bits)
     * @param colors Array of colors corresponding to coordinates
     */
    function setMultiplePixels(uint16[] calldata coordinates, bytes3[] calldata colors) 
        external 
        payable 
    {
        require(coordinates.length == colors.length, "Coordinates and colors length mismatch");
        require(coordinates.length > 0, "No pixels to set");
        require(msg.value >= PIXEL_PRICE * coordinates.length, "Insufficient payment for multiple pixels");
        
        for (uint256 i = 0; i < coordinates.length; i++) {
            uint8 x = uint8(coordinates[i] >> 8);
            uint8 y = uint8(coordinates[i] & 0xFF);
            
            require(x < CANVAS_SIZE && y < CANVAS_SIZE, "Invalid coordinates in batch");
            
            // Update pixel data
            pixels[x][y] = colors[i];
            pixelOwners[x][y] = msg.sender;
            pixelTimestamps[x][y] = block.timestamp;
            
            // Generate unique pixel ID and emit event
            uint256 pixelId = (uint256(x) << 8) | uint256(y);
            emit PixelSet(x, y, colors[i], msg.sender, block.timestamp, pixelId);
        }
        
        // Update statistics
        userPixelCounts[msg.sender] += coordinates.length;
        totalPixelsSet += coordinates.length;
        totalRevenue += PIXEL_PRICE * coordinates.length;
        
        // Refund excess payment
        uint256 totalCost = PIXEL_PRICE * coordinates.length;
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }
    
    /**
     * @notice Get pixel information
     * @param x X coordinate
     * @param y Y coordinate
     * @return color The pixel color
     * @return pixelOwner The address that set the pixel
     * @return timestamp When the pixel was set
     */
    function getPixelInfo(uint8 x, uint8 y) 
        external 
        view 
        validCoordinates(x, y)
        returns (bytes3 color, address pixelOwner, uint256 timestamp) 
    {
        return (pixels[x][y], pixelOwners[x][y], pixelTimestamps[x][y]);
    }
    
    /**
     * @notice Get canvas statistics
     * @return _totalPixelsSet Total number of pixels set
     * @return _totalRevenue Total revenue generated
     * @return _canvasSize Canvas dimensions
     */
    function getCanvasStats() 
        external 
        view 
        returns (uint256 _totalPixelsSet, uint256 _totalRevenue, uint8 _canvasSize) 
    {
        return (totalPixelsSet, totalRevenue, CANVAS_SIZE);
    }
    
    /**
     * @notice Get user statistics
     * @param user Address to check
     * @return pixelCount Number of pixels set by user
     */
    function getUserStats(address user) 
        external 
        view 
        returns (uint256 pixelCount) 
    {
        return userPixelCounts[user];
    }
    
    /**
     * @notice Get canvas data for a region
     * @param startX Starting X coordinate
     * @param startY Starting Y coordinate
     * @param width Width of the region
     * @param height Height of the region
     * @return colors Array of colors in the region
     */
    function getCanvasRegion(uint8 startX, uint8 startY, uint8 width, uint8 height) 
        external 
        view 
        returns (bytes3[] memory colors) 
    {
        require(startX + width <= CANVAS_SIZE, "Region exceeds canvas width");
        require(startY + height <= CANVAS_SIZE, "Region exceeds canvas height");
        
        colors = new bytes3[](width * height);
        uint256 index = 0;
        
        for (uint8 y = startY; y < startY + height; y++) {
            for (uint8 x = startX; x < startX + width; x++) {
                colors[index] = pixels[x][y];
                index++;
            }
        }
        
        return colors;
    }
    
    /**
     * @notice Get full canvas data (use with caution - expensive)
     * @return colors All pixel colors in row-major order
     */
    function getFullCanvas() external view returns (bytes3[] memory colors) {
        colors = new bytes3[](CANVAS_SIZE * CANVAS_SIZE);
        uint256 index = 0;
        
        for (uint8 y = 0; y < CANVAS_SIZE; y++) {
            for (uint8 x = 0; x < CANVAS_SIZE; x++) {
                colors[index] = pixels[x][y];
                index++;
            }
        }
        
        return colors;
    }
    
    /**
     * @notice Clear the entire canvas (owner only)
     * @dev This is an emergency function and should be used sparingly
     */
    function clearCanvas() external onlyOwner {
        for (uint8 x = 0; x < CANVAS_SIZE; x++) {
            for (uint8 y = 0; y < CANVAS_SIZE; y++) {
                delete pixels[x][y];
                delete pixelOwners[x][y];
                delete pixelTimestamps[x][y];
            }
        }
        
        totalPixelsSet = 0;
        emit CanvasCleared(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner).transfer(balance);
    }
    
    /**
     * @notice Transfer ownership (owner only)
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner must be different from current owner");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * @notice Get contract balance
     * @return balance Current contract balance
     */
    function getBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }
    
    /**
     * @notice Emergency function to pause the contract (owner only)
     * @dev In a production version, this would use OpenZeppelin's Pausable
     */
    bool public paused = false;
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    // Add whenNotPaused to setPixel functions
    function setPixelSafe(uint8 x, uint8 y, bytes3 color) 
        external 
        payable 
        whenNotPaused
        validCoordinates(x, y)
        sufficientPayment 
    {
        setPixel(x, y, color);
    }
} 