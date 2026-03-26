use anchor_lang::prelude::*;
use crate::state::Platform;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [Platform::SEED],
        bump,
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializePlatform>,
    epoch_duration: i64,
    base_stake_price: u64,
) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    platform.authority = ctx.accounts.authority.key();
    platform.current_epoch = 0;
    platform.epoch_duration = epoch_duration;
    platform.base_stake_price = base_stake_price;
    platform.curve_k_bps = 2000; // 0.20
    platform.creator_share_bps = 1200;
    platform.pool_share_bps = 8800;
    platform.total_epochs_resolved = 0;
    platform.total_sol_staked = 0;
    platform.bump = ctx.bumps.platform;
    Ok(())
}
