use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
    pub staker: Pubkey,
    pub post: Pubkey,
    pub epoch_number: u64,
    pub amount: u64,
    pub position: u32,
    pub claimed: bool,
    pub bump: u8,
}

impl StakeAccount {
    pub const SEED: &'static [u8] = b"stake";
}
