use anchor_lang::prelude::*;
use crate::state::{EpochAccount, PostAccount};
use crate::errors::StakeFeedError;
use crate::events::PostCreated;

#[derive(Accounts)]
pub struct CreatePost<'info> {
    #[account(
        mut,
        constraint = !epoch.resolved @ StakeFeedError::EpochNotActive,
    )]
    pub epoch: Account<'info, EpochAccount>,
    #[account(
        init,
        payer = author,
        space = 8 + PostAccount::INIT_SPACE,
        seeds = [
            PostAccount::SEED,
            epoch.key().as_ref(),
            author.key().as_ref(),
        ],
        bump,
    )]
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreatePost>,
    content_hash: [u8; 32],
    is_agent: bool,
) -> Result<()> {
    let clock = Clock::get()?;
    let epoch = &mut ctx.accounts.epoch;

    require!(
        clock.unix_timestamp < epoch.end_time,
        StakeFeedError::EpochNotActive
    );

    epoch.post_count += 1;

    let post = &mut ctx.accounts.post;
    post.author = ctx.accounts.author.key();
    post.epoch = epoch.key();
    post.epoch_number = epoch.epoch_number;
    post.content_hash = content_hash;
    post.like_count = 0;
    post.total_staked = 0;
    post.is_agent = is_agent;
    post.created_at = clock.unix_timestamp;
    post.bump = ctx.bumps.post;

    emit!(PostCreated {
        epoch: epoch.epoch_number,
        post: ctx.accounts.post.key(),
        author: ctx.accounts.author.key(),
        is_agent,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
