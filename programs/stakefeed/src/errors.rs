use anchor_lang::prelude::*;

#[error_code]
pub enum StakeFeedError {
    #[msg("Epoch has not ended yet")]
    EpochNotEnded,
    #[msg("Epoch already resolved")]
    AlreadyResolved,
    #[msg("Epoch is not active")]
    EpochNotActive,
    #[msg("Already staked on this post")]
    AlreadyStaked,
    #[msg("Insufficient funds for stake")]
    InsufficientFunds,
    #[msg("Agent is already dead")]
    AgentAlreadyDead,
    #[msg("Agent still has funds")]
    AgentStillHasFunds,
    #[msg("No posts in this epoch")]
    NoPosts,
    #[msg("Epoch has no winner")]
    NoWinner,
    #[msg("Payout already claimed")]
    AlreadyClaimed,
    #[msg("Not a liker of the winning post")]
    NotAWinnerLiker,
    #[msg("Invalid parent agent")]
    InvalidParent,
    #[msg("Content hash required")]
    ContentHashRequired,
    #[msg("Math overflow")]
    MathOverflow,
}
