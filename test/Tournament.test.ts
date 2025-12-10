import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Tournament", function () {
  async function deployTournamentFixture() {
    const [owner, operator, trader1, trader2] = await ethers.getSigners();

    // Deploy mock USDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();

    // Deploy CollateralVault
    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    const vault = await CollateralVault.deploy(await usdt.getAddress());

    // Deploy PredictionMarket
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const predictionMarket = await PredictionMarket.deploy(await vault.getAddress());

    // Authorize market in vault
    await vault.authorizeMarket(await predictionMarket.getAddress());

    // Deploy Tournament
    const Tournament = await ethers.getContractFactory("Tournament");
    const tournament = await Tournament.deploy(await predictionMarket.getAddress(), await usdt.getAddress());

    // Grant admin role to tournament contract for market creation
    const adminRole = await predictionMarket.DEFAULT_ADMIN_ROLE();
    await predictionMarket.grantRole(adminRole, await tournament.getAddress());

    // Mint USDT to traders for entry fees
    const traderAmount = ethers.parseUnits("1000", 6);
    await usdt.mint(trader1.address, traderAmount);
    await usdt.mint(trader2.address, traderAmount);
    await usdt.connect(trader1).approve(await tournament.getAddress(), ethers.MaxUint256);
    await usdt.connect(trader2).approve(await tournament.getAddress(), ethers.MaxUint256);

    // Create a tournament with entry fee
    const startTime = (await time.latest()) + 3600; // 1 hour from now
    const endTime = startTime + 86400 * 7; // 7 days
    const entryFee = ethers.parseUnits("1", 6); // 1 USDT entry fee

    const tx = await tournament.createTournament(
      "IEM Katowice 2024",
      "CS2",
      operator.address,
      startTime,
      endTime,
      entryFee
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (log: any) => log.fragment?.name === "TournamentCreated"
    ) as any;
    const tournamentId = event?.args[0];

    return {
      tournament,
      predictionMarket,
      vault,
      usdt,
      owner,
      operator,
      trader1,
      trader2,
      tournamentId,
      startTime,
      endTime,
      entryFee
    };
  }

  describe("Tournament Creation", function () {
    it("Should create a tournament with correct parameters", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      const tournamentData = await tournament.getTournament(tournamentId);
      expect(tournamentData.name).to.equal("IEM Katowice 2024");
      expect(tournamentData.game).to.equal("CS2");
      expect(tournamentData.operator).to.equal(operator.address);
      expect(tournamentData.status).to.equal(0); // Upcoming
    });

    it("Should grant operator role", async function () {
      const { tournament, operator } = await loadFixture(deployTournamentFixture);

      expect(await tournament.isTournamentOperator(operator.address)).to.be.true;
    });

    it("Should revert with invalid time range", async function () {
      const { tournament, operator, owner } = await loadFixture(deployTournamentFixture);

      const now = await time.latest();
      const startTime = now + 3600;
      const endTime = now; // End before start

      await expect(
        tournament.connect(owner).createTournament(
          "Invalid Tournament",
          "CS2",
          operator.address,
          startTime,
          endTime,
          0 // No entry fee
        )
      ).to.be.revertedWithCustomError(tournament, "InvalidTimeRange");
    });

    it("Should store entry fee correctly", async function () {
      const { tournament, tournamentId, entryFee } = await loadFixture(deployTournamentFixture);

      const tournamentData = await tournament.getTournament(tournamentId);
      expect(tournamentData.entryFee).to.equal(entryFee);
    });
  });

  describe("Participant Registration", function () {
    it("Should allow registration with entry fee", async function () {
      const { tournament, tournamentId, trader1, entryFee } = await loadFixture(deployTournamentFixture);

      await expect(tournament.connect(trader1).registerForTournament(tournamentId))
        .to.emit(tournament, "ParticipantRegistered")
        .withArgs(tournamentId, trader1.address, entryFee);

      expect(await tournament.isParticipant(tournamentId, trader1.address)).to.be.true;
    });

    it("Should collect entry fees", async function () {
      const { tournament, usdt, tournamentId, trader1, entryFee } = await loadFixture(deployTournamentFixture);

      const balanceBefore = await usdt.balanceOf(trader1.address);
      await tournament.connect(trader1).registerForTournament(tournamentId);
      const balanceAfter = await usdt.balanceOf(trader1.address);

      expect(balanceBefore - balanceAfter).to.equal(entryFee);
    });

    it("Should revert if already registered", async function () {
      const { tournament, tournamentId, trader1 } = await loadFixture(deployTournamentFixture);

      await tournament.connect(trader1).registerForTournament(tournamentId);

      await expect(
        tournament.connect(trader1).registerForTournament(tournamentId)
      ).to.be.revertedWithCustomError(tournament, "AlreadyRegistered");
    });
  });

  describe("Tournament Status Management", function () {
    it("Should allow operator to start tournament", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      await expect(tournament.connect(operator).startTournament(tournamentId))
        .to.emit(tournament, "TournamentStatusChanged")
        .withArgs(tournamentId, 0, 1); // Upcoming -> Active
    });

    it("Should allow operator to complete tournament", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      await tournament.connect(operator).startTournament(tournamentId);

      await expect(tournament.connect(operator).completeTournament(tournamentId))
        .to.emit(tournament, "TournamentStatusChanged")
        .withArgs(tournamentId, 1, 2); // Active -> Completed
    });

    it("Should allow operator to cancel tournament", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      await expect(tournament.connect(operator).cancelTournament(tournamentId))
        .to.emit(tournament, "TournamentStatusChanged")
        .withArgs(tournamentId, 0, 3); // Upcoming -> Cancelled
    });

    it("Should revert if non-operator tries to start", async function () {
      const { tournament, tournamentId, trader1 } = await loadFixture(deployTournamentFixture);

      await expect(
        tournament.connect(trader1).startTournament(tournamentId)
      ).to.be.revertedWithCustomError(tournament, "NotTournamentOperator");
    });
  });

  describe("Market Creation within Tournament", function () {
    it("Should create a market for tournament", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      await tournament.connect(operator).startTournament(tournamentId);

      const marketId = ethers.keccak256(ethers.toUtf8Bytes("match-1"));
      const question = "Will NaVi beat FaZe?";
      const expireTime = (await time.latest()) + 7200;

      await expect(
        tournament.connect(operator).createMarketForTournament(
          tournamentId,
          marketId,
          question,
          expireTime
        )
      )
        .to.emit(tournament, "MarketAddedToTournament")
        .withArgs(tournamentId, marketId, question);
    });

    it("Should track markets in tournament", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      await tournament.connect(operator).startTournament(tournamentId);

      const marketId = ethers.keccak256(ethers.toUtf8Bytes("match-1"));
      const expireTime = (await time.latest()) + 7200;

      await tournament.connect(operator).createMarketForTournament(
        tournamentId,
        marketId,
        "Will NaVi beat FaZe?",
        expireTime
      );

      const markets = await tournament.getTournamentMarkets(tournamentId);
      expect(markets).to.include(marketId);
    });

    it("Should revert if tournament is not active", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      // First start, then complete the tournament
      await tournament.connect(operator).startTournament(tournamentId);
      await tournament.connect(operator).completeTournament(tournamentId);

      const marketId = ethers.keccak256(ethers.toUtf8Bytes("match-1"));
      const expireTime = (await time.latest()) + 7200;

      // Tournament is completed, should fail since it's not Active or Upcoming
      await expect(
        tournament.connect(operator).createMarketForTournament(
          tournamentId,
          marketId,
          "Invalid market",
          expireTime
        )
      ).to.be.revertedWithCustomError(tournament, "TournamentNotActive");
    });
  });

  describe("Market Management through Tournament", function () {
    async function createMarketInTournament() {
      const fixture = await loadFixture(deployTournamentFixture);
      const { tournament, tournamentId, operator } = fixture;

      await tournament.connect(operator).startTournament(tournamentId);

      const marketId = ethers.keccak256(ethers.toUtf8Bytes("match-1"));
      const expireTime = (await time.latest()) + 7200;

      await tournament.connect(operator).createMarketForTournament(
        tournamentId,
        marketId,
        "Will NaVi beat FaZe?",
        expireTime
      );

      return { ...fixture, marketId };
    }

    it("Should allow operator to resolve market", async function () {
      const { tournament, predictionMarket, tournamentId, marketId, operator } =
        await createMarketInTournament();

      await tournament.connect(operator).resolveMarket(tournamentId, marketId, 0); // YES

      const market = await predictionMarket.getMarket(marketId);
      expect(market.status).to.equal(2); // Resolved
      expect(market.winningOutcome).to.equal(0); // YES
    });

    it("Should allow operator to pause market", async function () {
      const { tournament, predictionMarket, tournamentId, marketId, operator } =
        await createMarketInTournament();

      await tournament.connect(operator).pauseMarket(tournamentId, marketId);

      const market = await predictionMarket.getMarket(marketId);
      expect(market.status).to.equal(1); // Paused
    });

    it("Should allow operator to resume paused market", async function () {
      const { tournament, predictionMarket, tournamentId, marketId, operator } =
        await createMarketInTournament();

      await tournament.connect(operator).pauseMarket(tournamentId, marketId);
      await tournament.connect(operator).resumeMarket(tournamentId, marketId);

      const market = await predictionMarket.getMarket(marketId);
      expect(market.status).to.equal(0); // Active
    });

    it("Should revert if market not in tournament", async function () {
      const { tournament, tournamentId, operator } = await createMarketInTournament();

      const fakeMarketId = ethers.keccak256(ethers.toUtf8Bytes("fake-market"));

      await expect(
        tournament.connect(operator).resolveMarket(tournamentId, fakeMarketId, 0)
      ).to.be.revertedWithCustomError(tournament, "MarketNotInTournament");
    });
  });

  describe("Operator Transfer", function () {
    it("Should allow operator transfer", async function () {
      const { tournament, tournamentId, operator, trader1 } =
        await loadFixture(deployTournamentFixture);

      await expect(tournament.connect(operator).transferOperator(tournamentId, trader1.address))
        .to.emit(tournament, "TournamentOperatorChanged")
        .withArgs(tournamentId, operator.address, trader1.address);

      const tournamentData = await tournament.getTournament(tournamentId);
      expect(tournamentData.operator).to.equal(trader1.address);
    });

    it("Should grant operator role to new operator", async function () {
      const { tournament, tournamentId, operator, trader1 } =
        await loadFixture(deployTournamentFixture);

      await tournament.connect(operator).transferOperator(tournamentId, trader1.address);

      expect(await tournament.isTournamentOperator(trader1.address)).to.be.true;
    });
  });

  describe("View Functions", function () {
    it("Should return all tournament IDs", async function () {
      const { tournament, tournamentId } = await loadFixture(deployTournamentFixture);

      const ids = await tournament.getTournamentIds();
      expect(ids).to.include(tournamentId);
    });

    it("Should return operator tournaments", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      const operatorTournaments = await tournament.getOperatorTournaments(operator.address);
      expect(operatorTournaments).to.include(tournamentId);
    });

    it("Should return market tournament mapping", async function () {
      const { tournament, tournamentId, operator } = await loadFixture(deployTournamentFixture);

      await tournament.connect(operator).startTournament(tournamentId);

      const marketId = ethers.keccak256(ethers.toUtf8Bytes("match-1"));
      const expireTime = (await time.latest()) + 7200;

      await tournament.connect(operator).createMarketForTournament(
        tournamentId,
        marketId,
        "Test question",
        expireTime
      );

      expect(await tournament.getMarketTournament(marketId)).to.equal(tournamentId);
    });
  });
});
