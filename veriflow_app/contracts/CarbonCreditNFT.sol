// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CarbonCreditNFT
 * @dev ERC-721 NFT contract for tokenizing carbon credits from verified plantations
 *
 * Features:
 * - Each NFT represents a verified carbon sequestration amount
 * - Project ID mapping for traceability
 * - IPFS metadata storage
 * - Fixed pricing model to prevent inflation
 * - Ownership transfer capabilities for marketplace trading
 *
 * Deployment: Polygon Amoy Testnet
 * Network: 80002 (0x13882)
 */
contract CarbonCreditNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    // Token ID counter
    Counters.Counter private _tokenIdCounter;

    // Struct to store carbon credit data
    struct CarbonCredit {
        string projectId;           // Unique project identifier from backend
        uint256 carbonAmount;       // Carbon sequestered in wei (18 decimals, represents kg)
        uint256 mintedAt;          // Timestamp of minting
        address originalOwner;      // Original minter/farmer
        bool isActive;             // Status flag
    }

    // Mapping from token ID to carbon credit data
    mapping(uint256 => CarbonCredit) public carbonCredits;

    // Mapping from project ID to token ID (for uniqueness)
    mapping(string => uint256) public projectToToken;

    // Mapping to track if a project has already been minted
    mapping(string => bool) public projectMinted;

    // Fixed price per ton of CO2 in wei (0.02 MATIC per ton)
    uint256 public constant PRICE_PER_TON = 20000000000000000; // 0.02 MATIC

    // Events
    event CarbonCreditMinted(
        uint256 indexed tokenId,
        string projectId,
        uint256 carbonAmount,
        address indexed owner
    );

    event CarbonCreditTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 price
    );

    event PriceCalculated(
        uint256 indexed tokenId,
        uint256 carbonKg,
        uint256 price
    );

    constructor() ERC721("Veriflow Carbon Credit", "VCC") Ownable(msg.sender) {
        // Start token IDs at 1
        _tokenIdCounter.increment();
    }

    /**
     * @dev Mint a new carbon credit NFT
     * @param to Address to mint the NFT to
     * @param projectId Unique project identifier
     * @param carbonAmount Amount of carbon sequestered (in wei, 18 decimals = kg)
     * @param metadataURI IPFS URI containing NFT metadata
     * @return tokenId The ID of the newly minted token
     */
    function mintCarbonCredit(
        address to,
        string memory projectId,
        uint256 carbonAmount,
        string memory metadataURI
    ) public returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(projectId).length > 0, "Project ID cannot be empty");
        require(carbonAmount > 0, "Carbon amount must be greater than zero");
        require(!projectMinted[projectId], "Project already minted");

        // Get current token ID and increment counter
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Mint the NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        // Store carbon credit data
        carbonCredits[tokenId] = CarbonCredit({
            projectId: projectId,
            carbonAmount: carbonAmount,
            mintedAt: block.timestamp,
            originalOwner: to,
            isActive: true
        });

        // Map project ID to token ID
        projectToToken[projectId] = tokenId;
        projectMinted[projectId] = true;

        // Emit event
        emit CarbonCreditMinted(tokenId, projectId, carbonAmount, to);

        return tokenId;
    }

    /**
     * @dev Get carbon credit details for a token
     * @param tokenId Token ID to query
     * @return projectId Project identifier
     * @return carbonAmount Carbon sequestered (in wei/kg)
     * @return mintedAt Timestamp of minting
     * @return originalOwner Original owner address
     * @return isActive Status flag
     */
    function getCarbonCredit(uint256 tokenId)
        public
        view
        returns (
            string memory projectId,
            uint256 carbonAmount,
            uint256 mintedAt,
            address originalOwner,
            bool isActive
        )
    {
        require(_exists(tokenId), "Token does not exist");
        CarbonCredit memory credit = carbonCredits[tokenId];
        return (
            credit.projectId,
            credit.carbonAmount,
            credit.mintedAt,
            credit.originalOwner,
            credit.isActive
        );
    }

    /**
     * @dev Get token ID by project ID
     * @param projectId Project identifier
     * @return tokenId Associated token ID
     */
    function getTokenByProjectId(string memory projectId)
        public
        view
        returns (uint256)
    {
        require(projectMinted[projectId], "Project not minted");
        return projectToToken[projectId];
    }

    /**
     * @dev Get carbon amount for a token
     * @param tokenId Token ID to query
     * @return carbonAmount Carbon sequestered (in wei/kg)
     */
    function getCarbonAmount(uint256 tokenId)
        public
        view
        returns (uint256)
    {
        require(_exists(tokenId), "Token does not exist");
        return carbonCredits[tokenId].carbonAmount;
    }

    /**
     * @dev Calculate purchase price for a carbon credit NFT
     * @param tokenId Token ID to calculate price for
     * @return price Price in wei (MATIC)
     */
    function calculatePrice(uint256 tokenId)
        public
        view
        returns (uint256)
    {
        require(_exists(tokenId), "Token does not exist");

        // Get carbon amount in kg (wei with 18 decimals)
        uint256 carbonKg = carbonCredits[tokenId].carbonAmount;

        // Convert kg to tons (divide by 1000)
        // Price = (carbonKg / 1000) * PRICE_PER_TON
        // To maintain precision: (carbonKg * PRICE_PER_TON) / 1000
        uint256 price = (carbonKg * PRICE_PER_TON) / (1000 * 1e18);

        return price;
    }

    /**
     * @dev Get all token IDs owned by an address
     * @param owner Address to query
     * @return tokenIds Array of token IDs
     */
    function tokensOfOwner(address owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 currentIndex = 0;

        // Iterate through all minted tokens
        uint256 maxTokenId = _tokenIdCounter.current() - 1;
        for (uint256 i = 1; i <= maxTokenId; i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                tokenIds[currentIndex] = i;
                currentIndex++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev Get total number of minted tokens
     * @return count Total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }

    /**
     * @dev Check if a project has been minted
     * @param projectId Project identifier
     * @return bool True if minted, false otherwise
     */
    function isProjectMinted(string memory projectId)
        public
        view
        returns (bool)
    {
        return projectMinted[projectId];
    }

    /**
     * @dev Deactivate a carbon credit (e.g., if it's been retired/used)
     * @param tokenId Token ID to deactivate
     */
    function deactivateCarbonCredit(uint256 tokenId) public {
        require(_exists(tokenId), "Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender || owner() == msg.sender,
            "Not authorized"
        );

        carbonCredits[tokenId].isActive = false;
    }

    /**
     * @dev Override required by Solidity for ERC721URIStorage
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override required by Solidity for ERC721URIStorage
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Check if a token exists
     * @param tokenId Token ID to check
     * @return bool True if exists, false otherwise
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < _tokenIdCounter.current();
    }
}
