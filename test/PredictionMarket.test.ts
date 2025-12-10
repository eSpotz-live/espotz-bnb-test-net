import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PredictionMarket", function () {
  async function deployMarketFixture() {
    const [owner, operator, trader1, trader2] = await ethers.getSigners();

    // Deploy mock USDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();

    // Deploy CollateralVault
    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    const vault = await CollateralVault.deploy(await usdt.getAddress());

    // Deploy PredictionMarket
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const market = await PredictionMarket.deploy(await vault.getAddress());

    // Authorize market in vault
    await vault.authorizeMarket(await market.getAddress());

    // Mint USDT to traders
    const amount = ethers.parseUnits("10000", 6);
    await usdt.mint(trader1.address, amount);
    await usdt.mint(trader2.address, amount);

    // Approve vault
    await usdt.connect(trader1).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt.connect(trader2).approve(await vault.getAddress(), ethers.MaxUint256);

    // Deposit to vault
    await vault.connect(trader1).deposit(amount);
    await vault.connect(trader2).deposit(amount);

    // Create a market
    const marketId = ethers.keccak256(ethers.toUtf8Bytes("test-market-1"));
    const question = "Will Team A win the match?";
    const expireTime = (await time.latest()) + 86400; // 24 hours from now

    await market.createMarket(marketId, question, expireTime, operator.address);

    return { market, vault, usdt, owner, operator, trader1, trader2, marketId, expireTime };
  }

  describe("Market Creation", function () {
    it("Should create a market with correct parameters", async function () {
      const { market, marketId, operator } = await loadFixture(deployMarketFixture);

      const marketData = await market.getMarket(marketId);
      expect(marketData.marketId).to.equal(marketId);
      expect(marketData.tournamentOperator).to.equal(operator.address);
      expect(marketData.status).to.equal(0); // Active
    });

    it("Should deploy YES and NO tokens", async function () {
      const { market, marketId } = await loadFixture(deployMarketFixture);

      const marketData = await market.getMarket(marketId);
      expect(marketData.yesToken).to.not.equal(ethers.ZeroAddress);
      expect(marketData.noToken).to.not.equal(ethers.ZeroAddress);
    });

    it("Should revert if market already exists", async function () {
      const { market, marketId, operator } = await loadFixture(deployMarketFixture);
      const expireTime = (await time.latest()) + 86400;

      await expect(
        market.createMarket(marketId, "Duplicate", expireTime, operator.address)
      ).to.be.revertedWithCustomError(market, "MarketAlreadyExists");
    });
  });

  describe("Order Placement", function () {
    it("Should place a BUY order", async function () {
      const { market, marketId, trader1 } = await loadFixture(deployMarketFixture);

      const price = 5000n; // 50%
      const quantity = ethers.parseUnits("10", 6); // 10 shares
      const expireTime = (await time.latest()) + 3600;

      const tx = await market.connect(trader1).placeOrder(
        marketId,
        0, // BUY
        0, // YES
        price,
        quantity,
        expireTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "OrderPlaced"
      );

      expect(event).to.not.be.undefined;
    });

    it("Should revert on invalid price", async function () {
      const { market, marketId, trader1 } = await loadFixture(deployMarketFixture);

      const quantity = ethers.parseUnits("10", 6);
      const expireTime = (await time.latest()) + 3600;

      // Price = 0
      await expect(
        market.connect(trader1).placeOrder(marketId, 0, 0, 0, quantity, expireTime)
      ).to.be.revertedWithCustomError(market, "InvalidPrice");

      // Price >= 10000
      await expect(
        market.connect(trader1).placeOrder(marketId, 0, 0, 10000, quantity, expireTime)
      ).to.be.revertedWithCustomError(market, "InvalidPrice");
    });

    it("Should lock collateral for BUY orders", async function () {
      const { market, vault, marketId, trader1 } = await loadFixture(deployMarketFixture);

      const price = 5000n; // 50%
      const quantity = ethers.parseUnits("10", 6);
      const expireTime = (await time.latest()) + 3600;

      const availableBefore = await vault.getAvailableBalance(trader1.address);

      await market.connect(trader1).placeOrder(marketId, 0, 0, price, quantity, expireTime);

      const availableAfter = await vault.getAvailableBalance(trader1.address);
      const expectedLocked = (quantity * price) / 10000n;

      expect(availableBefore - availableAfter).to.equal(expectedLocked);
    });
  });

  describe("Order Cancellation", function () {
    it("Should cancel an open order", async function () {
      const { market, marketId, trader1 } = await loadFixture(deployMarketFixture);

      const price = 5000n;
      const quantity = ethers.parseUnits("10", 6);
      const expireTime = (await time.latest()) + 3600;

      const tx = await market.connect(trader1).placeOrder(
        marketId,
        0, // BUY
        0, // YES
        price,
        quantity,
        expireTime
      );

      const receipt = await tx.wait();
      const orderPlacedEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "OrderPlaced"
      ) as any;
      const orderId = orderPlacedEvent?.args[0];

      await expect(market.connect(trader1).cancelOrder(orderId))
        .to.emit(market, "OrderCancelled")
        .withArgs(orderId, trader1.address);
    });

    it("Should unlock collateral on cancellation", async function () {
      const { market, vault, marketId, trader1 } = await loadFixture(deployMarketFixture);

      const price = 5000n;
      const quantity = ethers.parseUnits("10", 6);
      const expireTime = (await time.latest()) + 3600;

      const availableBefore = await vault.getAvailableBalance(trader1.address);

      const tx = await market.connect(trader1).placeOrder(
        marketId, 0, 0, price, quantity, expireTime
      );

      const receipt = await tx.wait();
      const orderPlacedEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "OrderPlaced"
      ) as any;
      const orderId = orderPlacedEvent?.args[0];

      await market.connect(trader1).cancelOrder(orderId);

      const availableAfter = await vault.getAvailableBalance(trader1.address);
      expect(availableAfter).to.equal(availableBefore);
    });

    it("Should revert if not order owner", async function () {
      const { market, marketId, trader1, trader2 } = await loadFixture(deployMarketFixture);

      const price = 5000n;
      const quantity = ethers.parseUnits("10", 6);
      const expireTime = (await time.latest()) + 3600;

      const tx = await market.connect(trader1).placeOrder(
        marketId, 0, 0, price, quantity, expireTime
      );

      const receipt = await tx.wait();
      const orderPlacedEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "OrderPlaced"
      ) as any;
      const orderId = orderPlacedEvent?.args[0];

      await expect(
        market.connect(trader2).cancelOrder(orderId)
      ).to.be.revertedWithCustomError(market, "NotOrderOwner");
    });
  });

  describe("Market Status Management", function () {
    it("Should allow operator to pause market", async function () {
      const { market, marketId, operator } = await loadFixture(deployMarketFixture);

      await expect(market.connect(operator).pauseMarket(marketId))
        .to.emit(market, "MarketStatusChanged")
        .withArgs(marketId, 0, 1); // Active -> Paused
    });

    it("Should allow operator to resume market", async function () {
      const { market, marketId, operator } = await loadFixture(deployMarketFixture);

      await market.connect(operator).pauseMarket(marketId);

      await expect(market.connect(operator).resumeMarket(marketId))
        .to.emit(market, "MarketStatusChanged")
        .withArgs(marketId, 1, 0); // Paused -> Active
    });

    it("Should revert if non-operator tries to pause", async function () {
      const { market, marketId, trader1 } = await loadFixture(deployMarketFixture);

      await expect(
        market.connect(trader1).pauseMarket(marketId)
      ).to.be.revertedWithCustomError(market, "UnauthorizedOperator");
    });
  });

  describe("Market Resolution", function () {
    it("Should allow operator to resolve market", async function () {
      const { market, marketId, operator } = await loadFixture(deployMarketFixture);

      await expect(market.connect(operator).resolveMarket(marketId, 0)) // YES wins
        .to.emit(market, "MarketResolved")
        .withArgs(marketId, 0, operator.address);

      const marketData = await market.getMarket(marketId);
      expect(marketData.status).to.equal(2); // Resolved
      expect(marketData.winningOutcome).to.equal(0); // YES
    });

    it("Should allow operator to cancel market", async function () {
      const { market, marketId, operator } = await loadFixture(deployMarketFixture);

      await expect(market.connect(operator).cancelMarket(marketId))
        .to.emit(market, "MarketStatusChanged")
        .withArgs(marketId, 0, 3); // Active -> Cancelled
    });
  });

  describe("View Functions", function () {
    it("Should return all market IDs", async function () {
      const { market, marketId } = await loadFixture(deployMarketFixture);

      const ids = await market.getMarketIds();
      expect(ids).to.include(marketId);
    });

    it("Should return user orders", async function () {
      const { market, marketId, trader1 } = await loadFixture(deployMarketFixture);

      const price = 5000n;
      const quantity = ethers.parseUnits("10", 6);
      const expireTime = (await time.latest()) + 3600;

      await market.connect(trader1).placeOrder(marketId, 0, 0, price, quantity, expireTime);

      const userOrders = await market.getUserOrders(trader1.address);
      expect(userOrders.length).to.equal(1);
    });
  });
});
