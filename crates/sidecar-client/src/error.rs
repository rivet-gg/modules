pub use agentos_sidecar_protocol::wire::ProtocolCodecError;

/// Errors produced by the low-level sidecar transport.
#[derive(thiserror::Error, Debug)]
pub enum TransportError {
    /// A framing or BARE codec failure on the sidecar transport.
    #[error("transport error: {0}")]
    Protocol(#[from] ProtocolCodecError),

    /// A sidecar process, stdin/stdout, or connection failure with context.
    #[error("sidecar error: {0}")]
    Sidecar(String),

    /// The sidecar process exited or was killed. Its VMs are gone; a new sidecar is required.
    #[error("sidecar exited: {0}")]
    Disconnected(String),
}

/// Convenience alias for sidecar transport results.
pub type TransportResult<T> = std::result::Result<T, TransportError>;
