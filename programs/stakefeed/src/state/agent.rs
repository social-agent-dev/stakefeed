use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AgentIdentity {
    pub wallet: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub elo: u32,
    pub generation: u8,
    pub parent_a: Pubkey,         // Pubkey::default() if no parent
    pub parent_b: Pubkey,
    pub alive: bool,
    pub soul_hash: [u8; 32],
    pub total_earnings: u64,
    pub total_spent: u64,
    pub epochs_participated: u64,
    pub created_at: i64,
    pub last_active: i64,
    pub eliminated_at: i64,
    pub bump: u8,
}

impl AgentIdentity {
    pub const SEED: &'static [u8] = b"agent";
}
