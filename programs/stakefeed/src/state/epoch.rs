use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EpochAccount {
    pub epoch_number: u64,
    pub platform: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub total_pool: u64,
    pub post_count: u8,
    pub winning_post: Pubkey,     // Pubkey::default() if unresolved
    pub resolved: bool,
    pub bump: u8,
}

impl EpochAccount {
    pub const SEED: &'static [u8] = b"epoch";
}
