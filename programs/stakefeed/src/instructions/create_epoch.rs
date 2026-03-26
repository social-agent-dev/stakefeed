use anchor_lang::prelude::*;
use crate::state::{Platform, EpochAccount};

#[derive(Accounts)]
pub struct CreateEpoch<'info> {
    #[account(
        mut,
        seeds = [Platform::SEED],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,
    #[account(
        init,
        payer = cranker,
        space = 8 + EpochAccount::INIT_SPACE,
        seeds = [
            EpochAccount::SEED,
            platform.key().as_ref(),
            (platform.current_epoch + 1).to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub epoch: Account<'info, EpochAccount>,
    #[account(mut)]
    pub cranker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateEpoch>) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    platform.current_epoch += 1;

    let clock = Clock::get()?;
    let epoch = &mut ctx.accounts.epoch;
    epoch.epoch_number = platform.current_epoch;
    epoch.platform = platform.key();
    epoch.start_time = clock.unix_timestamp;
    epoch.end_time = clock.unix_timestamp + platform.epoch_duration;
    epoch.total_pool = 0;
    epoch.post_count = 0;
    epoch.winning_post = Pubkey::default();
    epoch.resolved = false;
    epoch.bump = ctx.bumps.epoch;
    Ok(())
}
