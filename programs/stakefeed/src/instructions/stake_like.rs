use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Platform, EpochAccount, PostAccount, StakeAccount};
use crate::errors::StakeFeedError;
use crate::events::StakePlaced;

#[derive(Accounts)]
pub struct StakeLike<'info> {
    #[account(
        seeds = [Platform::SEED],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,
    #[account(
        mut,
        constraint = !epoch.resolved @ StakeFeedError::EpochNotActive,
    )]
    pub epoch: Account<'info, EpochAccount>,
    #[account(
        mut,
        constraint = post.epoch == epoch.key(),
    )]
    pub post: Account<'info, PostAccount>,
    #[account(
        init,
        payer = staker,
        space = 8 + StakeAccount::INIT_SPACE,
        seeds = [
            StakeAccount::SEED,
            post.key().as_ref(),
            staker.key().as_ref(),
        ],
        bump,
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

pub fn handler(ctx: Context<StakeLike>) -> Result<()> {
    let clock = Clock::get()?;
    let epoch = &ctx.accounts.epoch;

    require!(
        clock.unix_timestamp < epoch.end_time,
        StakeFeedError::EpochNotActive
    );

    let platform = &ctx.accounts.platform;
    let post = &ctx.accounts.post;

    // Bonding curve: base_price * (100 + like_count * curve_k_bps / 100) / 100
    // e.g. 5_000_000 * (100 + 3 * 20) / 100 = 5_000_000 * 160 / 100 = 8_000_000
    let price = platform
        .base_stake_price
        .checked_mul(
            100u64
                .checked_add(
                    (post.like_count as u64)
                        .checked_mul(platform.curve_k_bps as u64 / 100)
                        .ok_or(StakeFeedError::MathOverflow)?,
                )
                .ok_or(StakeFeedError::MathOverflow)?,
        )
        .ok_or(StakeFeedError::MathOverflow)?
        .checked_div(100)
        .ok_or(StakeFeedError::MathOverflow)?;

    // Transfer SOL from staker to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.staker.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        price,
    )?;

    // Grab keys before mutable borrows
    let post_key = ctx.accounts.post.key();
    let staker_key = ctx.accounts.staker.key();

    // Update post
    let post = &mut ctx.accounts.post;
    let position = post.like_count;
    post.like_count += 1;
    post.total_staked = post
        .total_staked
        .checked_add(price)
        .ok_or(StakeFeedError::MathOverflow)?;
    let new_like_count = post.like_count;

    // Update epoch pool
    let epoch = &mut ctx.accounts.epoch;
    epoch.total_pool = epoch
        .total_pool
        .checked_add(price)
        .ok_or(StakeFeedError::MathOverflow)?;
    let epoch_number = epoch.epoch_number;

    // Create stake record
    let stake = &mut ctx.accounts.stake;
    stake.staker = staker_key;
    stake.post = post_key;
    stake.epoch_number = epoch_number;
    stake.amount = price;
    stake.position = position;
    stake.claimed = false;
    stake.bump = ctx.bumps.stake;

    // Calculate next price for event
    let next_price = platform
        .base_stake_price
        .checked_mul(
            100u64
                .checked_add(
                    (new_like_count as u64)
                        .checked_mul(platform.curve_k_bps as u64 / 100)
                        .ok_or(StakeFeedError::MathOverflow)?,
                )
                .ok_or(StakeFeedError::MathOverflow)?,
        )
        .ok_or(StakeFeedError::MathOverflow)?
        .checked_div(100)
        .ok_or(StakeFeedError::MathOverflow)?;

    emit!(StakePlaced {
        epoch: epoch_number,
        post: post_key,
        staker: staker_key,
        amount: price,
        position,
        new_price: next_price,
    });

    Ok(())
}
