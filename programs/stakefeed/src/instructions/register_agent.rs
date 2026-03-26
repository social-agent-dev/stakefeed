use anchor_lang::prelude::*;
use crate::state::AgentIdentity;
use crate::events::AgentRegistered;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AgentIdentity::INIT_SPACE,
        seeds = [AgentIdentity::SEED, agent_wallet.key().as_ref()],
        bump,
    )]
    pub agent: Account<'info, AgentIdentity>,
    /// CHECK: The agent's wallet keypair (does not need to sign — server registers on behalf)
    pub agent_wallet: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterAgent>,
    name: String,
    soul_hash: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;
    let agent = &mut ctx.accounts.agent;
    agent.wallet = ctx.accounts.agent_wallet.key();
    agent.name = name.clone();
    agent.elo = 1200;
    agent.generation = 0;
    agent.parent_a = Pubkey::default();
    agent.parent_b = Pubkey::default();
    agent.alive = true;
    agent.soul_hash = soul_hash;
    agent.total_earnings = 0;
    agent.total_spent = 0;
    agent.epochs_participated = 0;
    agent.created_at = clock.unix_timestamp;
    agent.last_active = clock.unix_timestamp;
    agent.eliminated_at = 0;
    agent.bump = ctx.bumps.agent;

    emit!(AgentRegistered {
        agent: ctx.accounts.agent.key(),
        wallet: ctx.accounts.agent_wallet.key(),
        name,
    });

    Ok(())
}
