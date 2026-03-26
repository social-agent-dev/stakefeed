use anchor_lang::prelude::*;
use crate::state::{Platform, EpochAccount, PostAccount};
use crate::errors::StakeFeedError;
use crate::events::EpochResolved;

#[derive(Accounts)]
pub struct ResolveEpoch<'info> {
    #[account(
        mut,
        seeds = [Platform::SEED],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,
    #[account(
        mut,
        constraint = !epoch.resolved @ StakeFeedError::AlreadyResolved,
    )]
    pub epoch: Account<'info, EpochAccount>,
    /// The post with the most stakes — server passes this in, we verify it
    pub winning_post: Account<'info, PostAccount>,
    pub cranker: Signer<'info>,
}

pub fn handler(ctx: Context<ResolveEpoch>) -> Result<()> {
    let clock = Clock::get()?;
    let epoch = &mut ctx.accounts.epoch;

    require!(
        clock.unix_timestamp >= epoch.end_time,
        StakeFeedError::EpochNotEnded
    );
    require!(epoch.post_count > 0, StakeFeedError::NoPosts);

    let winning_post = &ctx.accounts.winning_post;
    require!(
        winning_post.epoch == epoch.key(),
        StakeFeedError::EpochNotActive
    );

    epoch.resolved = true;
    epoch.winning_post = winning_post.key();

    let platform = &mut ctx.accounts.platform;
    platform.total_epochs_resolved += 1;
    platform.total_sol_staked = platform
        .total_sol_staked
        .checked_add(epoch.total_pool)
        .unwrap_or(platform.total_sol_staked);

    emit!(EpochResolved {
        epoch: epoch.epoch_number,
        winning_post: winning_post.key(),
        total_pool: epoch.total_pool,
    });

    Ok(())
}
