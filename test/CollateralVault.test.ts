import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CollateralVault", function () {
  async function deployVaultFixture() {
    const [owner, user1, user2, market] = await ethers.getSigners();

    // Deploy mock USDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();

    // Deploy CollateralVault
    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    const vault = await CollateralVault.deploy(await usdt.getAddress());

    // Mint USDT to users for testing
    const amount = ethers.parseUnits("10000", 6); // 10,000 USDT
    await usdt.mint(user1.address, amount);
    await usdt.mint(user2.address, amount);

    // Approve vault to spend USDT
    await usdt.connect(user1).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt.connect(user2).approve(await vault.getAddress(), ethers.MaxUint256);

    return { vault, usdt, owner, user1, user2, market };
  }

  describe("Deployment", function () {
    it("Should set the correct collateral token", async function () {
      const { vault, usdt } = await loadFixture(deployVaultFixture);
      expect(await vault.collateralToken()).to.equal(await usdt.getAddress());
    });

    it("Should set the correct owner", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should revert with zero address token", async function () {
      const CollateralVault = await ethers.getContractFactory("CollateralVault");
      await expect(
        CollateralVault.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(CollateralVault, "ZeroAddress");
    });
  });

  describe("Deposits", function () {
    it("Should allow deposits", async function () {
      const { vault, user1 } = await loadFixture(deployVaultFixture);
      const amount = ethers.parseUnits("100", 6);

      await expect(vault.connect(user1).deposit(amount))
        .to.emit(vault, "Deposited")
        .withArgs(user1.address, amount);

      expect(await vault.balances(user1.address)).to.equal(amount);
      expect(await vault.totalDeposited()).to.equal(amount);
    });

    it("Should revert on zero amount deposit", async function () {
      const { vault, user1 } = await loadFixture(deployVaultFixture);
      await expect(
        vault.connect(user1).deposit(0)
      ).to.be.revertedWithCustomError(vault, "ZeroAmount");
    });
  });

  describe("Withdrawals", function () {
    it("Should allow withdrawals of unlocked balance", async function () {
      const { vault, usdt, user1 } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      const withdrawAmount = ethers.parseUnits("50", 6);

      await vault.connect(user1).deposit(depositAmount);

      const balanceBefore = await usdt.balanceOf(user1.address);
      await vault.connect(user1).withdraw(withdrawAmount);
      const balanceAfter = await usdt.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(withdrawAmount);
      expect(await vault.balances(user1.address)).to.equal(depositAmount - withdrawAmount);
    });

    it("Should revert on insufficient unlocked balance", async function () {
      const { vault, user1, market, owner } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      const lockAmount = ethers.parseUnits("80", 6);

      await vault.connect(user1).deposit(depositAmount);
      await vault.connect(owner).authorizeMarket(market.address);
      await vault.connect(market).lockCollateral(user1.address, lockAmount);

      // Try to withdraw more than unlocked balance
      await expect(
        vault.connect(user1).withdraw(ethers.parseUnits("50", 6))
      ).to.be.revertedWithCustomError(vault, "InsufficientUnlockedBalance");
    });
  });

  describe("Collateral Locking", function () {
    it("Should allow authorized markets to lock collateral", async function () {
      const { vault, user1, market, owner } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      const lockAmount = ethers.parseUnits("50", 6);

      await vault.connect(user1).deposit(depositAmount);
      await vault.connect(owner).authorizeMarket(market.address);

      await expect(vault.connect(market).lockCollateral(user1.address, lockAmount))
        .to.emit(vault, "CollateralLocked")
        .withArgs(user1.address, lockAmount, market.address);

      expect(await vault.lockedBalances(user1.address)).to.equal(lockAmount);
      expect(await vault.getAvailableBalance(user1.address)).to.equal(depositAmount - lockAmount);
    });

    it("Should revert if market is not authorized", async function () {
      const { vault, user1, market } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);

      await vault.connect(user1).deposit(depositAmount);

      await expect(
        vault.connect(market).lockCollateral(user1.address, depositAmount)
      ).to.be.revertedWithCustomError(vault, "UnauthorizedMarket");
    });

    it("Should allow authorized markets to unlock collateral", async function () {
      const { vault, user1, market, owner } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      const lockAmount = ethers.parseUnits("50", 6);

      await vault.connect(user1).deposit(depositAmount);
      await vault.connect(owner).authorizeMarket(market.address);
      await vault.connect(market).lockCollateral(user1.address, lockAmount);

      await expect(vault.connect(market).unlockCollateral(user1.address, lockAmount))
        .to.emit(vault, "CollateralUnlocked")
        .withArgs(user1.address, lockAmount, market.address);

      expect(await vault.lockedBalances(user1.address)).to.equal(0);
    });
  });

  describe("Collateral Transfer", function () {
    it("Should allow authorized markets to transfer locked collateral", async function () {
      const { vault, user1, user2, market, owner } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      const transferAmount = ethers.parseUnits("50", 6);

      await vault.connect(user1).deposit(depositAmount);
      await vault.connect(owner).authorizeMarket(market.address);
      await vault.connect(market).lockCollateral(user1.address, transferAmount);

      await expect(
        vault.connect(market).transferLockedCollateral(user1.address, user2.address, transferAmount)
      )
        .to.emit(vault, "CollateralTransferred")
        .withArgs(user1.address, user2.address, transferAmount, market.address);

      expect(await vault.balances(user1.address)).to.equal(depositAmount - transferAmount);
      expect(await vault.balances(user2.address)).to.equal(transferAmount);
    });
  });

  describe("Market Authorization", function () {
    it("Should allow owner to authorize markets", async function () {
      const { vault, market, owner } = await loadFixture(deployVaultFixture);

      await expect(vault.connect(owner).authorizeMarket(market.address))
        .to.emit(vault, "MarketAuthorized")
        .withArgs(market.address);

      expect(await vault.authorizedMarkets(market.address)).to.be.true;
    });

    it("Should allow owner to deauthorize markets", async function () {
      const { vault, market, owner } = await loadFixture(deployVaultFixture);

      await vault.connect(owner).authorizeMarket(market.address);
      await expect(vault.connect(owner).deauthorizeMarket(market.address))
        .to.emit(vault, "MarketDeauthorized")
        .withArgs(market.address);

      expect(await vault.authorizedMarkets(market.address)).to.be.false;
    });

    it("Should revert if non-owner tries to authorize", async function () {
      const { vault, market, user1 } = await loadFixture(deployVaultFixture);

      await expect(
        vault.connect(user1).authorizeMarket(market.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });
});
