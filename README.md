

# Solana Auto Swap

This script executes Solana transactions based on input parameters.

## Installation

1. Clone the repository to your local machine:

   ```
   git clone https://github.com/Merrick17/solana-auto-swap.git 
   ```

2. Navigate to the project directory:

   ```
   cd solana-auto-swap
   ```

3. Install dependencies using npm:

   ```
   npm install
   ```

## Environment Variables

Before running the script, you need to create a `.env` file in the root directory of the project. Add the following variables to the `.env` file:

```
PRIVATE_KEY=your_private_key_here
FEE_WALLET=fee_wallet_address
MINT=token_mint_address
INPUT_AMOUNT=100 // Example input amount, adjust as needed
TYPE=B // Example transaction type, adjust as needed
LOOPS=5 // Number of loops to execute, adjust as needed
```

Replace `your_private_key_here`, `fee_wallet_address`, `token_mint_address`, and other values with your actual values.

## Execution

To execute the script and run transactions, use the following command:

```
npm run dev
```

This command will run the script in development mode, executing the specified number of loops as defined in the `.env` file.

## Notes

- Make sure you have Node.js and npm installed on your machine.
- Ensure that the provided RPC endpoint in the script (`https://solana-mainnet.g.alchemy.com/v2/bYvXTPXDlkcg7JxAUXywhMnFHqq6oi1K`) is accessible and valid.
- Review the script logic and adjust input parameters (`INPUT_AMOUNT`, `TYPE`, `LOOPS`, etc.) as per your requirements before running.

---

Feel free to customize the README file further based on your specific project details and requirements.