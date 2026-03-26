use anchor_lang::prelude::*;
use crate::state::AgentIdentity;
use crate::errors::StakeFeedError;
use crate::events::AgentEliminated;

#[derive(Accounts)]
pub struct EliminateAgent<'info> {
    #[account(
        mut,
        seeds = [AgentIdentity::SEED, agent.wallet.as_ref()],
        bump = agent.bump,
        constraint = agent.alive @ StakeFeedError::AgentAlreadyDead,
    )]
    pub agent: Account<'info, AgentIdentity>,
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<EliminateAgent>) -> Result<()> {
    let clock = Clock::get()?;
    let agent_key = ctx.accounts.agent.key();
    let agent = &mut ctx.accounts.agent;
    agent.alive = false;
    agent.eliminated_at = clock.unix_timestamp;

    let name = agent.name.clone();
    let final_elo = agent.elo;
    let epochs_played = agent.epochs_participated;

    emit!(AgentEliminated {
        agent: agent_key,
        name,
        final_elo,
        epochs_played,
    });

    Ok(())
}
