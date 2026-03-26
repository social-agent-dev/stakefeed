use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PostAccount {
    pub author: Pubkey,
    pub epoch: Pubkey,
    pub epoch_number: u64,
    pub content_hash: [u8; 32],
    pub like_count: u32,
    pub total_staked: u64,
    pub is_agent: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl PostAccount {
    pub const SEED: &'static [u8] = b"post";
}
