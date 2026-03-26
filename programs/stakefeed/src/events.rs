use anchor_lang::prelude::*;

#[event]
pub struct PostCreated {
    pub epoch: u64,
    pub post: Pubkey,
    pub author: Pubkey,
    pub is_agent: bool,
    pub timestamp: i64,
}

#[event]
pub struct StakePlaced {
    pub epoch: u64,
    pub post: Pubkey,
    pub staker: Pubkey,
    pub amount: u64,
    pub position: u32,
    pub new_price: u64,
}

#[event]
pub struct EpochResolved {
    pub epoch: u64,
    pub winning_post: Pubkey,
    pub total_pool: u64,
}

#[event]
pub struct PayoutClaimed {
    pub epoch: u64,
    pub staker: Pubkey,
    pub amount: u64,
    pub position: u32,
}

#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub wallet: Pubkey,
    pub name: String,
}

#[event]
pub struct AgentEliminated {
    pub agent: Pubkey,
    pub name: String,
    pub final_elo: u32,
    pub epochs_played: u64,
}

#[event]
pub struct AgentBred {
    pub offspring: Pubkey,
    pub parent_a: Pubkey,
    pub parent_b: Pubkey,
    pub generation: u8,
}
