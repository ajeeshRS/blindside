use anchor_lang::prelude::*;

#[error_code]
pub enum BlindsideError {
    #[msg("Slot index doesn't match this round")]
    WrongSlot,
    #[msg("This round can't be opened yet, or it's too late to open it")]
    OpenWindowClosed,
    #[msg("The previous round in this slot isn't finished")]
    SlotBusy,
    #[msg("Rounds only move forward")]
    RoundNotNewer,
    #[msg("This round isn't open")]
    RoundNotOpen,
    #[msg("Calls for this round haven't opened or have closed")]
    CallsClosed,
    #[msg("Side must be up (1) or down (2)")]
    BadSide,
    #[msg("Stake is outside the allowed range")]
    BadStake,
    #[msg("You already made a call this round")]
    AlreadyCalled,
    #[msg("This round is full")]
    RoundFull,
    #[msg("Not enough balance")]
    InsufficientBalance,
    #[msg("It's too early to reveal this round")]
    RevealTooEarly,
    #[msg("This round hasn't been revealed")]
    NotRevealed,
    #[msg("No call from this player in this round")]
    NoCall,
    #[msg("Already paid out")]
    AlreadyClaimed,
    #[msg("Settle your open calls before moving funds")]
    PendingCalls,
    #[msg("Wrong price feed account")]
    BadFeed,
    #[msg("The faucet can be used once an hour")]
    FaucetCooldown,
    #[msg("Arithmetic overflow")]
    Overflow,
}
