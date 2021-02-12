use std::{
    future::Future,
    pin::Pin,
    sync::atomic::{AtomicBool, Ordering},
    task::{Context, Poll},
};

use anyhow::Result;

static CONTROL: AtomicBool = AtomicBool::new(false);
#[derive(Clone)]
pub struct Control {}
#[allow(dead_code)]
impl Control {
    pub fn init() -> Result<()> {
        ctrlc::set_handler(|| {
            CONTROL.store(true, Ordering::SeqCst);
        })?;

        Ok(())
    }

    #[inline]
    pub fn should_stop() -> bool { CONTROL.load(Ordering::SeqCst) }

    #[inline]
    pub fn should_stop_async() -> ShouldStop { ShouldStop }

    #[inline]
    pub fn stop() { CONTROL.store(true, Ordering::SeqCst); }
}

pub struct ShouldStop;
impl Future for ShouldStop {
    type Output = ();
    fn poll(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<Self::Output> {
        if Control::should_stop() {
            Poll::Ready(())
        } else {
            Poll::Pending
        }
    }
}

/// Wraps an expression with a `Result` type and panics in the `Err` case.
#[macro_export]
macro_rules! unrecoverable {
    ($it:expr) => {
        match $it {
            Err(err) => panic!(err),
            Ok(value) => value,
        }
    };
}
