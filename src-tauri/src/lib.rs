use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

#[derive(Serialize, Deserialize, Debug)]
pub struct LLMTestResponse {
    pub success: bool,
    pub status_code: u16,
    pub body: String,
    pub latency_ms: u64,
}

#[tauri::command]
async fn test_llm_connection(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<LLMTestResponse, String> {
    let start = std::time::Instant::now();
    
    // Create client with 10-second timeout
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    
    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => client.get(&url),
    };

    for (k, v) in headers {
        req = req.header(k, v);
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let response = req.send().await.map_err(|e| format!("Connection failed: {}", e))?;
    let response_status = response.status();
    let status_code = response_status.as_u16();
    let is_success = response_status.is_success();
    let body_text = response.text().await.map_err(|e| format!("Failed to read response body: {}", e))?;
    let latency_ms = start.elapsed().as_millis() as u64;

    Ok(LLMTestResponse {
        success: is_success,
        status_code,
        body: body_text,
        latency_ms,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![test_llm_connection])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
