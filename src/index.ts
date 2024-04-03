import dotenv from "dotenv";
dotenv.config();
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import { transactionSenderAndConfirmationWaiter } from "./utils/transactionSender";
import { getSignature } from "./utils/getSignature";
import { createJupiterApiClient } from "@jup-ag/api";
import axios from "axios";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const FEE_WALLET = process.env.FEE_WALLET || "";
const MINT = process.env.MINT || "HCvqu6LeUeZiwiYWL5h8SqTSmzjpEh1LL2GmxtRu7Srz";
const INPUT_AMOUNT = Number(process.env.INPUT_AMOUNT || 0); // Convert to number
const TYPE = process.env.TYPE || "B";

export async function main() {
  const { data: tokenList } = await axios.get(`https://token.jup.ag/strict`);
  const jupiterQuoteApi = createJupiterApiClient();
  const wallet = new Wallet(
    Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY || ""))
  );
  console.log("Wallet:", wallet.publicKey.toBase58());

  // Make sure that you are using your own RPC endpoint.
  const connection = new Connection(
    "https://solana-mainnet.g.alchemy.com/v2/bYvXTPXDlkcg7JxAUXywhMnFHqq6oi1K"
  );
  let quote;
  let feeAmount;
  let feeTransaction;
  // get quote
  if (TYPE == "B") {
    feeAmount = INPUT_AMOUNT * 0.1; // Calculate feeAmount as 0.1 of INPUT_AMOUNT

    feeTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(FEE_WALLET),
        lamports: feeAmount * LAMPORTS_PER_SOL // Convert feeAmount to lamports
      })
    );

    quote = await jupiterQuoteApi.quoteGet({
      inputMint: "So11111111111111111111111111111111111111112",
      outputMint: MINT,
      amount: INPUT_AMOUNT * LAMPORTS_PER_SOL,
      slippageBps: 50,
      onlyDirectRoutes: false,
      asLegacyTransaction: false
    });
  } else {
    const token = tokenList.find((elm: any) => elm.address == MINT);

    const newAmount = INPUT_AMOUNT * Math.pow(10, token.decimals);
    quote = await jupiterQuoteApi.quoteGet({
      inputMint: MINT,
      outputMint: "So11111111111111111111111111111111111111112",
      amount: newAmount,
      slippageBps: 50,
      onlyDirectRoutes: false,
      asLegacyTransaction: false
    });

    feeAmount = Number(quote.outAmount) * 0.1;

    feeTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(FEE_WALLET),
        lamports: feeAmount
      })
    );
  }

  if (!quote) {
    console.error("unable to quote");
    return;
  }

  // Get serialized transaction
  const swapResult = await jupiterQuoteApi.swapPost({
    swapRequest: {
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto"
      // prioritizationFeeLamports: {
      //   autoMultiplier: 2,
      // },
    }
  });

  console.dir(swapResult, { depth: null });

  // Serialize the transaction
  const swapTransactionBuf = Buffer.from(swapResult.swapTransaction, "base64");
  var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  // Sign the transaction
  transaction.sign([wallet.payer]);
  const signature = getSignature(transaction);

  // We first simulate whether the transaction would be successful
  const { value: simulatedTransactionResponse } =
    await connection.simulateTransaction(transaction, {
      replaceRecentBlockhash: true,
      commitment: "processed"
    });
  const { err, logs } = simulatedTransactionResponse;

  if (err) {
    // Simulation error, we can check the logs for more details
    // If you are getting an invalid account error, make sure that you have the input mint account to actually swap from.
    console.error("Simulation Error:");
    console.error({ err, logs });
    return;
  }

  const serializedTransaction = Buffer.from(transaction.serialize());
  const blockhash = transaction.message.recentBlockhash;

  const transactionResponse = await transactionSenderAndConfirmationWaiter({
    connection,
    serializedTransaction,
    blockhashWithExpiryBlockHeight: {
      blockhash,
      lastValidBlockHeight: swapResult.lastValidBlockHeight
    }
  });

  // If we are not getting a response back, the transaction has not confirmed.
  if (!transactionResponse) {
    console.error("Transaction not confirmed");
    return;
  }

  if (transactionResponse.meta?.err) {
    console.error(transactionResponse.meta?.err);
  }

  // Sign transaction, broadcast, and confirm
  const feeSignature = await sendAndConfirmTransaction(
    connection,
    feeTransaction,
    [wallet.payer]
  );
  console.log("SIGNATURE", feeSignature);

  console.log(`https://solscan.io/tx/${signature}`);
}

async function runMainLoop() {
  const numberOfLoops = process.env.LOOPS || 1; // Change this to the desired number of loops

  for (let i = 0; i < Number(numberOfLoops); i++) {
    console.log(`Loop ${i + 1}`);
    await main(); // Call the main function inside the loop
    console.log("----------------------");
  }
}

runMainLoop();
