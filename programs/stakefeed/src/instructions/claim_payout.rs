use anchor_lang::prelude::*;
use crate::state::{Platform, EpochAccount, PostAccount, StakeAccount};
use crate::errors::StakeFeedError;
use crate::events::PayoutClaimed;

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(
        seeds = [Platform::SEED],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,
    #[account(
        constraint = epoch.resolved @ StakeFeedError::EpochNotActive,
    )]
    pub epoch: Account<'info, EpochAccount>,
    #[account(
        constraint = winning_post.key() == epoch.winning_post @ StakeFeedError::NoWinner,
    )]
    pub winning_post: Account<'info, PostAccount>,
    #[account(
        mut,
        constraint = stake.post == winning_post.key() @ StakeFeedError::NotAWinnerLiker,
        constraint = stake.staker == staker.key() @ StakeFeedError::NotAWinnerLiker,
        constraint = !stake.claimed @ StakeFeedError::AlreadyClaimed,
    )]
    pub stake: Account<'info, StakeAccount>,
    /// CHECK: Epoch vault PDA that holds the pool funds
    #[account(
        mut,
        seeds = [b"vault", epoch.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub staker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimPayout>) -> Result<()> {
    let platform = &ctx.accounts.platform;
    let epoch = &ctx.accounts.epoch;
    let winning_post = &ctx.accounts.winning_post;
    let stake = &mut ctx.accounts.stake;

    // Calculate weight: 1/(position+1)
    // To avoid floats, use basis points:
    // weight_bps = 10000 / (position + 1)
    let position = stake.position;
    let like_count = winning_post.like_count;

    // Total weight = sum of 10000/(i+1) for i in 0..like_count
    let mut total_weight: u64 = 0;
    for i in 0..like_count {
        total_weight += 10000 / (i as u64 + 1);
    }

    let my_weight: u64 = 10000 / (position as u64 + 1);

    // Pool share: pool * pool_share_bps / 10000
    let distributable = epoch
        .total_pool
        .checked_mul(platform.pool_share_bps as u64)
        .ok_or(StakeFeedError::MathOverflow)?
        .checked_div(10000)
        .ok_or(StakeFeedError::MathOverflow)?;

    // My payout: distributable * my_weight / total_weight
    let payout = distributable
        .checked_mul(my_weight)
        .ok_or(StakeFeedError::MathOverflow)?
        .checked_div(total_weight)
        .ok_or(StakeFeedError::MathOverflow)?;

    // Transfer from vault to staker
    let epoch_key = epoch.key();
    let vault_seeds: &[&[u8]] = &[
        b"vault",
        epoch_key.as_ref(),
        &[ctx.bumps.vault],
    ];

    let vault_info = ctx.accounts.vault.to_account_info();
    let staker_info = ctx.accounts.staker.to_account_info();

    **vault_info.try_borrow_mut_lamports()? -= payout;
    **staker_info.try_borrow_mut_lamports()? += payout;

    stake.claimed = true;

    emit!(PayoutClaimed {
        epoch: epoch.epoch_number,
        staker: ctx.accounts.staker.key(),
        amount: payout,
        position,
    });

    Ok(())
}
