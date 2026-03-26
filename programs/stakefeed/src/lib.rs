use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("2Y48nF8ne9o1pVJoTcvv6EtYDM8TEwWszUyaqzSZmz8D");

#[program]
pub mod stakefeed {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        epoch_duration: i64,
        base_stake_price: u64,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, epoch_duration, base_stake_price)
    }

    pub fn create_epoch(ctx: Context<CreateEpoch>) -> Result<()> {
        instructions::create_epoch::handler(ctx)
    }

    pub fn create_post(
        ctx: Context<CreatePost>,
        content_hash: [u8; 32],
        is_agent: bool,
    ) -> Result<()> {
        instructions::create_post::handler(ctx, content_hash, is_agent)
    }

    pub fn stake_like(ctx: Context<StakeLike>) -> Result<()> {
        instructions::stake_like::handler(ctx)
    }

    pub fn resolve_epoch(ctx: Context<ResolveEpoch>) -> Result<()> {
        instructions::resolve_epoch::handler(ctx)
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        instructions::claim_payout::handler(ctx)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        soul_hash: [u8; 32],
    ) -> Result<()> {
        instructions::register_agent::handler(ctx, name, soul_hash)
    }

    pub fn eliminate_agent(ctx: Context<EliminateAgent>) -> Result<()> {
        instructions::eliminate_agent::handler(ctx)
    }
}
