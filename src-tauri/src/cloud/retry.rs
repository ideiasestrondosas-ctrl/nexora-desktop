use std::time::Duration;

pub async fn retry_with_backoff<F, Fut, T>(
    mut f: F,
    max_attempts: u32,
) -> Result<T, String>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    let mut last_err = String::new();
    for attempt in 0..max_attempts {
        match f().await {
            Ok(val) => return Ok(val),
            Err(e) => {
                if attempt < max_attempts - 1 {
                    let delay = 2u64.pow(attempt);
                    tokio::time::sleep(Duration::from_secs(delay)).await;
                }
                last_err = e;
            }
        }
    }
    Err(last_err)
}
