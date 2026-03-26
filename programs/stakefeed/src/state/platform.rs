use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub authority: Pubkey,
    pub current_epoch: u64,
    pub epoch_duration: i64,
    pub base_stake_price: u64,    // lamports
    pub curve_k_bps: u16,         // 2000 = 0.20 (20% per like)
    pub creator_share_bps: u16,   // 1200 = 12%
    pub pool_share_bps: u16,      // 8800 = 88%
    pub total_epochs_resolved: u64,
    pub total_sol_staked: u64,
    pub bump: u8,
}

impl Platform {
    pub const SEED: &'static [u8] = b"platform";
}
