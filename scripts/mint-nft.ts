import * as anchor from '@project-serum/anchor'
import { AnchorProvider, Program, Wallet } from '@project-serum/anchor'
import { IDL } from '../target/types/nft'
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createInitializeMintInstruction, MINT_SIZE } from '@solana/spl-token' // IGNORE THESE ERRORS IF ANY
const { SystemProgram } = anchor.web3
import {
  PublicKey,
  Connection,
  Keypair,
  Commitment,
} from "@solana/web3.js";

async function main() {
  // const admin = Keypair.fromSecretKey(Uint8Array.from([31, 51, 235, 203, 226, 15, 147, 247, 38, 78, 36, 244, 235, 96, 241, 46, 101, 186, 74, 2, 160, 28, 106, 92, 228, 89, 185, 111, 75, 208, 2, 65, 198, 250, 19, 116, 17, 147, 56, 172, 224, 159, 255, 186, 6, 96, 198, 219, 216, 19, 221, 55, 207, 112, 209, 42, 163, 104, 154, 1, 75, 84, 126, 195]));
  const admin = Keypair.fromSecretKey(Uint8Array.from([
    97, 99, 123, 72, 209, 135, 165, 48, 46, 236, 88,
    223, 132, 80, 193, 180, 153, 17, 161, 200, 13, 84,
    194, 223, 69, 108, 1, 227, 150, 228, 36, 34, 250,
    8, 128, 110, 82, 104, 15, 206, 129, 84, 22, 107,
    218, 101, 219, 85, 99, 176, 165, 248, 238, 0, 103,
    179, 53, 201, 111, 147, 238, 51, 236, 184
  ]));

  const commitment: Commitment = "confirmed";
  // const connection = new Connection("https://api-mainnet-beta.renec.foundation:8899/", { commitment });
  const connection = new Connection("https://api-testnet.renec.foundation:8899", { commitment });
  // const connection = new Connection("https://api-devnet.renec.foundation:8899", { commitment });
  // const connection = new Connection("https://api.testnet.solana.com", { commitment })

  const wallet = new Wallet(admin);
  const provider = new AnchorProvider(connection, wallet, { commitment });
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    // "8dKAs5tx4T6ExuFVM85PtdbzBbZ3kfDfzURyDT94kGa6"
    // "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    "metaXfaoQatFJP9xiuYRsKkHYgS5NqqcfxFbLGS5LdN"
  );
  const programId = new PublicKey("HXr7HGzLdMAKicxjBaGkE1961DqqTPDwa37xVWbQfxCY");
  const program = new Program(IDL, programId, provider);
  const lamports: number =
    await connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );

  const getMetadata = async (
    mint: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> => {
    return (
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const getMasterEdition = async (
    mint: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> => {
    return (
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
  const NftTokenAccount = await getAssociatedTokenAddress(
    mintKey.publicKey,
    wallet.publicKey
  );
  console.log("NFT Account: ", NftTokenAccount.toBase58());

  const mint_tx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintKey.publicKey,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
      lamports,
    }),
    createInitializeMintInstruction(
      mintKey.publicKey,
      0,
      wallet.publicKey,
      wallet.publicKey
    ),
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      NftTokenAccount,
      wallet.publicKey,
      mintKey.publicKey
    )
  );

  const res = await provider.sendAndConfirm(mint_tx, [mintKey]);
  console.log(
    await connection.getParsedAccountInfo(mintKey.publicKey)
  );

  console.log("Account: ", res);
  console.log("Mint key: ", mintKey.publicKey.toString());
  console.log("User: ", wallet.publicKey.toString());

  const metadataAddress = await getMetadata(mintKey.publicKey);
  const masterEdition = await getMasterEdition(mintKey.publicKey);

  console.log("Metadata address: ", metadataAddress.toBase58());
  console.log("MasterEdition: ", masterEdition.toBase58());

  const tx = await program.methods.mintNft(
    mintKey.publicKey,
    "https://arweave.net/y5e5DJsiwH0s_ayfMwYk-SnrZtVZzHLQDSTZ5dNRUHA",
    "Red Monkey",
  )
    .accounts({
      mintAuthority: wallet.publicKey,
      mint: mintKey.publicKey,
      tokenAccount: NftTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      metadata: metadataAddress,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      masterEdition: masterEdition,
    },
    )
    .rpc();
  console.log("Your transaction signature", tx);
};

main();