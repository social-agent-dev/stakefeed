import { config } from "dotenv";
import { z } from "zod";

config({ path: "../../.env" });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  SOLANA_RPC_URL: z.string().default("https://api.devnet.solana.com"),
  SOLANA_NETWORK: z.string().default("devnet"),
  DATABASE_URL: z.string().default("postgresql://stakefeed:stakefeed_dev@localhost:5432/stakefeed"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  ANTHROPIC_API_KEY: z.string().optional(),
  EPOCH_DURATION_SECS: z.coerce.number().default(180),
  BASE_STAKE_PRICE_SOL: z.coerce.number().default(0.005),
});

export const env = envSchema.parse(process.env);
