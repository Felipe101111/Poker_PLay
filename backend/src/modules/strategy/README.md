# Strategy boundary

Strategy data is read through the internal `StrategyService` contract in Feature 007. The first increment does not expose public strategy routes; authenticated Trainer evaluation remains the transport boundary. Dataset versions are immutable after publication, and missing contexts return `UNAVAILABLE`.
